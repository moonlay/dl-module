"use strict";

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var LampStandard = DLModels.master.LampStandard;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var CodeGenerator = require("../../utils/code-generator");

module.exports = class LampStandardManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.LampStandard);
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
            var nameFilter = {
                "name": {
                    "$regex": regex
                }
            };
            var descriptionFilter = {
                "description": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [nameFilter, descriptionFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
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
                "code": {
                    "$regex": regex
                }
            };
            var nameFilter = {
                "name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, nameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(lampStandard) {
        var errors = {};
        var valid = lampStandard;
        // 1. begin: Declare promises.
        var getLampStandardPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            name: valid.name
        });

        // 2. begin: Validation.
        return Promise.all([getLampStandardPromise])
            .then(results => {
                var _lampStandard = results[0];

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("LampStandard.name.isRequired:%s is required", i18n.__("LampStandard.name._:Name")); //"Nama Standar Lampu Tidak Boleh Kosong";
                else if (_lampStandard) {
                    errors["name"] = i18n.__("LampStandard.name.isExists:%s is already exists", i18n.__("LampStandard.name._:Name")); //"Nama Standar Lampu sudah terdaftar";
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if(!valid.code)
                    valid.code = CodeGenerator();

                valid = new LampStandard(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.LampStandard}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var nameIndex = {
            name: `ix_${map.master.collection.LampStandard}_name`,
            key: {
                name: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, nameIndex]);
    }
}