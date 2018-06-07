"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var generateCode = require("../../utils/code-generator");
var map = DLModels.map;
var WorkingCapacitiesStandard = DLModels.spMasterPlan.WorkingCapacitiesStandard;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class ContactManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.spMasterPlan.collection.WorkingCapacitiesStandard);
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
            var remarkFilter = {
                "remark": {
                    "$regex": regex
                }
            };
            keywordFilter = remarkFilter;
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(workingCapacities){
        workingCapacities.code = !workingCapacities.code ? generateCode() : workingCapacities.code;
        workingCapacities._active = true;
        workingCapacities._createdDate= new Date();
        return Promise.resolve(workingCapacities);
    }

    _validate(workingCapacities) {
        var errors = {};
        var valid = workingCapacities;
        if(!valid.color){
            valid.color='#000000'
        }
        // 1. begin: Declare promises.
        var getWorkingCapacitiesPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            color: valid.color,
            _deleted: false
        });

        var getWorkingCapacitiesRangePromise = this.collection.firstOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            "$or":[{
                "$and":[{
                    start:{"$gte": valid.start}
                },
                {
                    start:{"$lte":valid.end}
                }]  
            },
            {
                "$and":[{
                    end:{"$gte":valid.start}
                },
                {
                   end:{"$lte":valid.end}
                }] 
                
                
            }
            ],
            _deleted: false
        });
        // 2. begin: Validation.
        return Promise.all([getWorkingCapacitiesPromise,getWorkingCapacitiesRangePromise])
            .then(results => {
                var duplicateWorkingCapacities = results[0];
                var range=results[1];

                if (duplicateWorkingCapacities) {
                    errors["color"] = i18n.__("WorkingCapacitiesStandard.color.isExists:%s is already exists", i18n.__("WorkingCapacitiesStandard.color._:Color"));
                }

                if(range){
                    errors["end"] = i18n.__("WorkingCapacitiesStandard.end.isExists:%s is already exists", i18n.__("WorkingCapacitiesStandard.end._:End"));
                    errors["start"] = i18n.__("WorkingCapacitiesStandard.start.isExists:%s is already exists", i18n.__("WorkingCapacitiesStandard.start._:Start"));
                }

                if(valid.end<=valid.start){
                    errors["end"] = i18n.__("WorkingCapacitiesStandard.end.shouldNot:%s should not less than start capacities", i18n.__("WorkingCapacitiesStandard.end._:End"));
                }

                if(!valid.remark || valid.remark===''){
                    errors["remark"] = i18n.__("WorkingCapacitiesStandard.remark.isRequired:%s is required", i18n.__("WorkingCapacitiesStandard.remark._:Remark"));
                }
                

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                if (!valid.stamp) {
                    valid = new WorkingCapacitiesStandard(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.spMasterPlan.collection.WorkingCapacitiesStandard}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var uearIndex = {
            name: `ix_${map.spMasterPlan.collection.WorkingCapacitiesStandard}__code`,
            key: {
                "code": 1
            }
        };

        return this.collection.createIndexes([dateIndex]);
    }
}
