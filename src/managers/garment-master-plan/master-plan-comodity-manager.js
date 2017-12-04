"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var MasterPlanComodity = DLModels.garmentMasterPlan.MasterPlanComodity;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class MasterPlanComodityManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.MasterPlanComodity);
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

    _validate(masterPlanComodity) {
        var errors = {};
        var valid = masterPlanComodity;
        // 1. begin: Declare promises.
        var getMasterPlanComodity = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code,
            _deleted: false
        });
        
        // 2. begin: Validation.
        return Promise.all([getMasterPlanComodity])
            .then(results => {
                var duplicateMasterPlanComodity = results[0];

                if(!valid.code || valid.code === "")
                    errors["code"] = i18n.__("MasterPlanComodity.code.isRequired:%s is required", i18n.__("MasterPlanComodity.code._:Code"));
                if (duplicateMasterPlanComodity) {
                    errors["code"] = i18n.__("MasterPlanComodity.code.isExists:%s is already exists", i18n.__("MasterPlanComodity.code._:Code"));
                }

                if(!valid.name || valid.name === "")
                    errors["name"] = i18n.__("MasterPlanComodity.name.isRequired:%s is required", i18n.__("MasterPlanComodity.name._:Name"));

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if (!valid.stamp) {
                    valid = new MasterPlanComodity(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentMasterPlan.collection.MasterPlanComodity}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.garmentMasterPlan.collection.MasterPlanComodity}_code`,
            key: {
                "code": 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}