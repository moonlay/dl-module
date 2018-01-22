'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Comodity = DLModels.master.Comodity;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var generateCode = require("../../utils/code-generator");

module.exports = class ComodityManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Comodity);
    }

    _beforeInsert(data) {
        if(!data.code)
            data.code = generateCode();
        return Promise.resolve(data);
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

    _validate(comodity) {
        var errors = {};
        var valid = comodity;
        // 1. begin: Declare promises.
        var getcomodityPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            // code: valid.code,
            name: valid.name,
            _deleted: false
        });

        // 2. begin: Validation.
        return Promise.all([getcomodityPromise])
            .then(results => {
                var _comodity = results[0];

                // if (!valid.code || valid.code == '')
                //     errors["code"] = i18n.__("Comodity.code.isRequired:%s is required", i18n.__("Comodity.code._:Code")); //"Nama Comodity Tidak Boleh Kosong";
                if (_comodity) {
                    // errors["code"] = i18n.__("Comodity.code.isExists:%s is already exists", i18n.__("Comodity.code._:Code")); //"kode Comodity sudah terdaftar";
                    errors["name"] = i18n.__("Comodity.name.isExists:%s is already exists", i18n.__("Comodity.name._:Name")); //"Nama Comodity sudah terdaftar";
                }

                if (!valid.name || valid.name == '')
                    errors["name"] = i18n.__("Comodity.name.isRequired:%s is required", i18n.__("Comodity.name._:Name")); //"Nama Harus diisi";
                
                // if (!valid.type || valid.type == '')
                //     errors["type"] = i18n.__("Comodity.type.isRequired:%s is required", i18n.__("Comodity.type._:Type")); //"type Harus diisi";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new Comodity(comodity);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Comodity}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Comodity}_code_name`,
            key: {
                code: 1,
                name:1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
