'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Budget = DLModels.master.Budget;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class BudgetManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Budget);
    }

    _getQuery(paging) {
        var _default = {
                _deleted: false
            },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var codeFilter = {
                'code': {
                    '$regex': regex
                }
            };
            var nameFilter = {
                'name': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [codeFilter, nameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(budget) {
        var errors = {};
        var valid = budget;
        // 1. begin: Declare promises.
        var getbudgetPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });

        // 2. begin: Validation.
        return Promise.all([getbudgetPromise])
            .then(results => {
                var _budget = results[0];

                if (!valid.code || valid.code == '')
                    errors["code"] = i18n.__("Budget.code.isRequired:%s is required", i18n.__("Budget.code._:Code")); //"Nama Budget Tidak Boleh Kosong";
                else if (_budget) {
                    errors["code"] = i18n.__("Budget.code.isExists:%s is already exists", i18n.__("Budget.code._:Code")); //"Nama Budget sudah terdaftar";
                }

                if (!valid.name || valid.name == '')
                    errors["name"] = i18n.__("Budget.name.isRequired:%s is required", i18n.__("Budget.name._:Name")); //"Nama Harus diisi";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new Budget(budget);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Budget}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Budget}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
