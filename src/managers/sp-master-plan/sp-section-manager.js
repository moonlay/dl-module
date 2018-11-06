"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var SpSection = DLModels.spMasterPlan.SpSection;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class SpSectionManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.spMasterPlan.collection.SpSection);
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

    _validate(spSection) {
        var errors = {};
        var valid = spSection;

        // 1. begin: Declare promises.

        // trim string for code and name
        valid.code = valid.code ? valid.code.trim() : "";
        valid.name = valid.name ? valid.name.trim() : "";

        var getSpSectionByCode = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code,
            _deleted: false
        });
        
        var getSpSectionByName = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            name: valid.name,
            _deleted: false
        });
        
        // 2. begin: Validation.
        return Promise.all([getSpSectionByCode, getSpSectionByName])
            .then(results => {
                var duplicateSpSectionByCode = results[0];
                var duplicateSpSectionByName = results[1];

                if(!valid.code || valid.code === "")
                    errors["code"] = i18n.__("SpSection.code.isRequired:%s is required", i18n.__("SpSection.code._:Code"));
                else if (duplicateSpSectionByCode)
                    errors["code"] = i18n.__("SpSection.name.isExists:%s already exists", i18n.__("SpSection.code._:Code"));
    
                if(!valid.name || valid.name === "")
                    errors["name"] = i18n.__("SpSection.name.isRequired:%s is required", i18n.__("SpSection.name._:Name"));
                else if (duplicateSpSectionByName)
                    errors["name"] = i18n.__("SpSection.name.isExists:%s already exists", i18n.__("SpSection.name._:Name"));

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if (!valid.stamp) {
                    valid = new SpSection(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.spMasterPlan.collection.SpSection}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.spMasterPlan.collection.SpSection}_code`,
            key: {
                "code": 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}