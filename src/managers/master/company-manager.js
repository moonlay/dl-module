"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var generateCode = require("../../utils/code-generator");
var map = DLModels.map;
var Company = DLModels.master.Company;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class CompanyManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Company);
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

    _beforeInsert(data) {
        data.code = generateCode();
    
        return Promise.resolve(data);
    }

    _validate(company) {
        var errors = {};
        var valid = company;
        // 1. begin: Declare promises.
        var getCompanyPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code
        });
        // 2. begin: Validation.
        return Promise.all([getCompanyPromise])
            .then(results => {
                var _duplicateCompany = results[0];

                if (_duplicateCompany) {
                    errors["code"] = i18n.__("Company.code.isExists:%s is already exists", i18n.__("Company.code._:Code")); //"Kode sudah ada";
                }

                if (!valid.name || valid.name == '')
                    errors["name"] = i18n.__("Company.name.isRequired:%s is required", i18n.__("Company.name._:Name")); //"Nama Harus diisi";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                
                if (!valid.stamp) {
                    valid = new Company(valid);
                }
               
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Company}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Company}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}
