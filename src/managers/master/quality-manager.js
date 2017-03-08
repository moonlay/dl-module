'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Quality = DLModels.master.Quality;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class QualityManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Quality);
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

    _validate(quality) {
        var errors = {};
        var valid = quality;
        // 1. begin: Declare promises.
        var getqualityPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code,
            name: valid.name
        });

        // 2. begin: Validation.
        return Promise.all([getqualityPromise])
            .then(results => {
                var _quality = results[0];

                if (!valid.code || valid.code == '')
                    errors["code"] = i18n.__("Quality.code.isRequired:%s is required", i18n.__("Quality.code._:Code")); //"Nama Quality Tidak Boleh Kosong";
                if (_quality) {
                    errors["code"] = i18n.__("Quality.code.isExists:%s is already exists", i18n.__("Quality.code._:Code")); //"kode Quality sudah terdaftar";
                    errors["name"] = i18n.__("Quality.name.isExists:%s is already exists", i18n.__("Quality.name._:Name")); //"Nama Quality sudah terdaftar";
                }

                if (!valid.name || valid.name == '')
                    errors["name"] = i18n.__("Quality.name.isRequired:%s is required", i18n.__("Quality.name._:Name")); //"Nama Harus diisi";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new Quality(quality);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Quality}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Quality}_code_name`,
            key: {
                code: 1,
                name:1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
