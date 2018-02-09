"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var generateCode = require("../../utils/code-generator");
var map = DLModels.map;
var WeeklyPlan = DLModels.garmentMasterPlan.WeeklyPlan;
var WeeklyPlanItem = DLModels.garmentMasterPlan.WeeklyPlanItem;
var BaseManager = require("module-toolkit").BaseManager;
var UnitManager = require("../master/unit-manager");
var i18n = require("dl-i18n");

module.exports = class WeeklyPlanManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.WeeklyPlan);
        this.unitManager = new UnitManager(db, user);
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
            var yearFilter = {
                "$where" : "function() { return this.year.toString().match(/"+ paging.keyword +"/) != null; }"
            };
            var unitFilter = {
                "unit.name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [yearFilter, unitFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(weeklyPlan) {
        var errors = {};
        var valid = weeklyPlan;
        // 1. begin: Declare promises.
        var getWeeklyPlanPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            year: valid.year,
            unitId: valid.unitId && ObjectId.isValid(valid.unitId) ? new ObjectId(valid.unitId) : '',
            _deleted: false
        });
        var getUnit = valid.unitId && ObjectId.isValid(valid.unitId) ? this.unitManager.getSingleByIdOrDefault(new ObjectId(valid.unitId)) : Promise.resolve(null);
        // 2. begin: Validation.
        return Promise.all([getWeeklyPlanPromise, getUnit])
            .then(results => {
                var duplicateWeeklyPlan = results[0];
                var _unit = results[1];

                if (duplicateWeeklyPlan) {
                    errors["year"] = i18n.__("WeeklyPlan.year.isExists:%s is already exists in selected unit", i18n.__("WeeklyPlan.year._:Weekly Plan"));
                }
                var current_year = (new Date()).getFullYear() + 10;
                var last_year = (new Date()).getFullYear() - 10;
                if (!valid.year) {
                    errors["year"] = i18n.__("WeeklyPlan.year.isRequired:%s is required", i18n.__("WeeklyPlan.year._:Year"));
                }
                else if (isNaN(valid.year)) {
                    errors["year"] = i18n.__("WeeklyPlan.year.mustNumber:%s must number", i18n.__("WeeklyPlan.year._:Year"));
                }
                else if ((valid.year < last_year) || (valid.year > current_year)) {
                    errors["year"] = i18n.__("WeeklyPlan.year.outOfRage:%s is out of range year", i18n.__("WeeklyPlan.year._:Year"));
                }

                if(!valid.unitId || valid.unitId === '')
                    errors["unit"] = i18n.__("WeeklyPlan.unit.isRequired:%s is required", i18n.__("WeeklyPlan.unit._:Unit"));
                else if(!_unit)
                    errors["unit"] = i18n.__("WeeklyPlan.unit.notFound:%s not found", i18n.__("WeeklyPlan.unit._:Unit"));

                if (valid.items && valid.items.length > 0) {
                    var itemErrors = [];
                    for (var item of valid.items) {
                        var itemError = {};
                        item.startDate = new Date(item.startDate);
                        item.endDate = new Date(item.endDate);
                        if (!item.month && item.month > 11 && item.month < 0) {
                            itemError["month"] = i18n.__("WeeklyPlan.items.month.isRequired:%s is required", i18n.__("WeeklyPlan.items.month._:Month"));
                        } else if (item.startDate.getMonth() != item.month && item.endDate.getMonth() != item.month) {
                            itemError["month"] = i18n.__("WeeklyPlan.items.month.isOutOfRange:%s is out of range", i18n.__("WeeklyPlan.items.month._:Month"));
                        }
                        if(!item.efficiency || item.efficiency <= 0)
                            itemError["efficiency"] = i18n.__("WeeklyPlan.items.efficiency.mustBeGreaterThan:%s must be greather than 0", i18n.__("WeeklyPlan.items.efficiency._:Efficiency"));
                        if(!item.operator || item.operator <= 0)
                            itemError["operator"] = i18n.__("WeeklyPlan.items.operator.mustBeGreaterThan:%s must be greather than 0", i18n.__("WeeklyPlan.items.operator._:Operator"));
                        if(!item.workingHours || item.workingHours <= 0)
                            itemError["workingHours"] = i18n.__("WeeklyPlan.items.workingHours.mustBeGreaterThan:%s must be greather than 0", i18n.__("WeeklyPlan.items.workingHours._:WorkingHours"));
                        itemErrors.push(itemError);
                    }

                    for (var itemError of itemErrors) {
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            errors.items = itemErrors;
                            break;
                        }
                    }

                }
                else {
                    errors["items"] = i18n.__("WeeklyPlan.items.isRequired:%s is required", i18n.__("WeeklyPlan.items._:Item"));
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                if(_unit){
                    valid.unitId = _unit._id;
                    valid.unit = _unit;
                }
                var items = [];
                for(var item of valid.items){
                    if (!item.stamp) {
                        item = new WeeklyPlanItem(item);
                    }
                    item.stamp(this.user.username, "manager");
                    items.push(item);
                }
                valid.items = items;
                if (!valid.stamp) {
                    valid = new WeeklyPlan(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentMasterPlan.collection.WeeklyPlan}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var uearIndex = {
            name: `ix_${map.garmentMasterPlan.collection.WeeklyPlan}_year_unitId`,
            key: {
                "year": 1,
                "unitId": 1,
            }
        };

        return this.collection.createIndexes([dateIndex]);
    }

    getWeek(keyword, filter){
        return new Promise((resolve, reject) => {
            var regex = new RegExp(keyword, "i");
            var query={};
            if(filter.weekNumber){
                query={
                    "year": filter.year,
                    "unit.code":filter.unit,
                    "items.weekNumber":filter.weekNumber,
                    _deleted:false
                }
            }
            else{
                query={
                    "year": filter.year,
                    "unit.code":filter.unit,
                    _deleted:false
                }
            }
            this.collection.aggregate(
                [
                     {$unwind:"$items"},
                    {
                   
                    $match: query
                },
            {$project: {'items':"$items"}}
                ]
            )
                .toArray(function (err, result) {
                    resolve(result);
                });
        });
    }

    getYear(keyword){
        return new Promise((resolve, reject) => {
            var regex = new RegExp(keyword, "i");
            var query = {
                stringifyYear : regex,
                _deleted : false,
            };
            this.collection.aggregate(
                [
                    { $project : {
                        stringifyYear : { "$toLower" : "$year" },
                        year : 1,
                        _deleted : 1
                    } },
                    { $match : query},
                    { $group : {
                        _id: "$year",
                        year: {$first : "$year"},
                    } },
                ]
            )
                .toArray(function (err, result) {
                    resolve(result);
                });
        });
    }

    getMonitoringRemainingEH(query) {
        return new Promise((resolve, reject) => {
            var deletedQuery = { _deleted: false };
            var yearQuery = {};
            if (query.year) {
                yearQuery = {
                    "year": Number(query.year)
                };
            }
            var unitQuery = {};
            if (query.unit) {
                unitQuery = {
                    "unit.code": query.unit
                };
            }

            var Query = { "$and": [ deletedQuery, yearQuery, unitQuery ] };
            this.collection
                .aggregate( [
                    { "$match": Query },
                    {
                        "$sort": {
                            "_createdDate": -1,
                        }
                    }
                ])
                .toArray()
                .then(results => {
                    resolve(results);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getMonitoringRemainingEHXls(query) {

    }


}
