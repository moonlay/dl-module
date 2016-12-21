"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var Supplier = DLModels.master.Supplier;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class SupplierManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.master.collection.Supplier);
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

    _validate(supplier) {
        var errors = {};
        var valid = supplier;
        // 1. begin: Declare promises.
        var getSupplierPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code
        });

        // 2. begin: Validation.
        return Promise.all([getSupplierPromise])
            .then(results => {
                var _supplier = results[0];

                if (!valid.code || valid.code == "")
                    errors["code"] = i18n.__("Supplier.code.isRequired:%s is required", i18n.__("Supplier.code._:Code")); //"Kode harus diisi ";
                else if (_supplier) {
                    errors["code"] = i18n.__("Supplier.code.isExists:%s is required", i18n.__("Supplier.code._:Code")); //"Kode sudah ada";
                }

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("Supplier.name.isExists:%s is required", i18n.__("Supplier.name._:Name")); //"Nama harus diisi";

                if (!valid.import)
                    valid.import = false;

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new Supplier(supplier);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }
    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Supplier}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Supplier}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}
