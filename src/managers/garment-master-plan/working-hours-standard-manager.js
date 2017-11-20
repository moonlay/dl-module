"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var generateCode = require("../../utils/code-generator");
var map = DLModels.map;
var WorkingHoursStandard = DLModels.garmentMasterPlan.WorkingHoursStandard;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class ContactManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.WorkingHoursStandard);
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

    _beforeInsert(workingHours){
        workingHours.code = !workingHours.code ? generateCode() : workingHours.code;
        workingHours._active = true;
        workingHours._createdDate= new Date();
        return Promise.resolve(workingHours);
    }

    _validate(workingHours) {
        var errors = {};
        var valid = workingHours;
        if(!valid.color){
            valid.color='#000000'
        }
        // 1. begin: Declare promises.
        var getWorkingHoursPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            color: valid.color,
            _deleted: false
        });

        var getWorkingHoursRangePromise = this.collection.firstOrDefault({
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
        return Promise.all([getWorkingHoursPromise,getWorkingHoursRangePromise])
            .then(results => {
                var duplicateWorkingHours = results[0];
                var range=results[1];

                if (duplicateWorkingHours) {
                    errors["color"] = i18n.__("WorkingHoursStandard.color.isExists:%s is already exists", i18n.__("WorkingHoursStandard.color._:Color"));
                }

                if(range){
                    errors["end"] = i18n.__("WorkingHoursStandard.end.isExists:%s is already exists", i18n.__("WorkingHoursStandard.end._:End"));
                    errors["start"] = i18n.__("WorkingHoursStandard.start.isExists:%s is already exists", i18n.__("WorkingHoursStandard.start._:Start"));
                }

                if(valid.end<=valid.start){
                    errors["end"] = i18n.__("WorkingHoursStandard.end.shouldNot:%s should not less than start hours", i18n.__("WorkingHoursStandard.end._:End"));
                }

                if(!valid.remark || valid.remark===''){
                    errors["remark"] = i18n.__("WorkingHoursStandard.remark.isRequired:%s is required", i18n.__("WorkingHoursStandard.remark._:Remark"));
                }
                

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                if (!valid.stamp) {
                    valid = new WorkingHoursStandard(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentMasterPlan.collection.WorkingHoursStandard}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var uearIndex = {
            name: `ix_${map.garmentMasterPlan.collection.WorkingHoursStandard}__code`,
            key: {
                "code": 1
            }
        };

        return this.collection.createIndexes([dateIndex]);
    }
}
