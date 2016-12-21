"use strict";

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var Division = DLModels.master.Division;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class DivisionManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Division);
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

    _validate(unit) {
        var errors = {};
        var valid = unit;
        // 1. begin: Declare promises.
        var getunitPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });

        // 2. begin: Validation.
        return Promise.all([getunitPromise])
            .then(results => {
                var _division = results[0];

                if (!valid.code || valid.code == "")
                    errors["code"] = i18n.__("Division.code.isRequired:%s is required", i18n.__("Division.code._:Code")); //"Divisi Tidak Boleh Kosong";
                else if (_division) {
                    errors["code"] = i18n.__("Division.code.isExists:%s is already exists", i18n.__("Division.code._:Code")); //"Perpaduan Divisi dan Sub Divisi sudah terdaftar";
                }

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("Division.name.isRequired:%s is required", i18n.__("Division.name._:Name")); //"Sub Divisi Tidak Boleh Kosong";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new Division(unit);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Unit}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Unit}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
