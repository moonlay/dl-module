"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var GarmentSection = DLModels.garmentMasterPlan.GarmentSection;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class GarmentSectionManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.GarmentSection);
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

    _validate(garmentSection) {
        var errors = {};
        var valid = garmentSection;

        // 1. begin: Declare promises.
        var getGarmentSection = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code,
            name: valid.name,
            _deleted: false
        });
        
        // 2. begin: Validation.
        return Promise.all([getGarmentSection])
            .then(results => {
                var duplicateGarmentSection = results[0];

                if(!valid.code || valid.code === "")
                    errors["code"] = i18n.__("GarmentSection.code.isRequired:%s is required", i18n.__("GarmentSection.code._:Code"));

                if(!valid.name || valid.name === "")
                    errors["name"] = i18n.__("GarmentSection.name.isRequired:%s is required", i18n.__("GarmentSection.name._:Name"));

                if (duplicateGarmentSection) {
                    errors["code"] = i18n.__("GarmentSection.name.isDuplicate:Duplicate %s and %s", i18n.__("GarmentSection.name._:Name"), i18n.__("GarmentSection.code._:Code"));
                    errors["name"] = i18n.__("GarmentSection.name.isDuplicate:Duplicate %s and %s", i18n.__("GarmentSection.name._:Name"), i18n.__("GarmentSection.code._:Code"));
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if (!valid.stamp) {
                    valid = new GarmentSection(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentMasterPlan.collection.GarmentSection}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.garmentMasterPlan.collection.GarmentSection}_code`,
            key: {
                "code": 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}