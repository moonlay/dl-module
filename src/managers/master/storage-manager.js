"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var Storage = DLModels.master.Storage;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class StorageManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Storage);
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

    _validate(storage) {
        var errors = {};
        var valid = storage;
        // 1. begin: Declare promises.
        var getBuyerPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code
        });
        // 2. begin: Validation.
        return Promise.all([getBuyerPromise])
            .then(results => {
                var _module = results[0];

                if (!valid.code || valid.code == "")
                    errors["code"] = i18n.__("Storage.code.isRequired:%s is required", i18n.__("Storage.code._:Code")); // "Kode harus diisi";
                else if (_module) {
                    errors["code"] = i18n.__("Storage.code.isExists:%s is already exists", i18n.__("Storage.code._:Code")); //"Kode sudah ada";
                }
                if (!valid.name || valid.name == '')
                    errors["name"] = i18n.__("Storage.name.isRequired:%s is required", i18n.__("Storage.name._:Name")); //"Nama Harus diisi";
   

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                if (!valid.tempo || valid.tempo == '')
                    valid.tempo = 0;

                valid = new Storage(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    } 

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Storage}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Storage}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}
