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
                        // if(!item.efficiency || item.efficiency <= 0)
                        //     itemError["efficiency"] = i18n.__("WeeklyPlan.items.efficiency.mustBeGreaterThan:%s must be greather than 0", i18n.__("WeeklyPlan.items.efficiency._:Efficiency"));
                        // if(!item.operator || item.operator <= 0)
                        //     itemError["operator"] = i18n.__("WeeklyPlan.items.operator.mustBeGreaterThan:%s must be greather than 0", i18n.__("WeeklyPlan.items.operator._:Operator"));
                        // if(!item.workingHours || item.workingHours <= 0)
                        //     itemError["workingHours"] = i18n.__("WeeklyPlan.items.workingHours.mustBeGreaterThan:%s must be greather than 0", i18n.__("WeeklyPlan.items.workingHours._:WorkingHours"));
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

            var regex = new RegExp(keyword, "i");
            var filterWeek = {
                "week": {
                    "$regex": regex
                }
            };

            this.collection.aggregate(
                [
                    { $unwind:"$items" },
                    { $match: query },
                    { $project: {
                        'items': "$items",
                        'week': {"$concat" : ["W",{ "$toLower" : "$items.weekNumber" }]},
                    } },
                    { $match: filterWeek },
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


    getUnit(keyword, filter){
        return new Promise((resolve, reject) => {
            var regex = new RegExp(keyword, "i");

            var unitCodeFilter = {
                "unit.code": {
                    "$regex": regex
                }
            };

            var unitNameFilter = {
                "unit.name": {
                    "$regex": regex
                }
            };

            var keywordFilter = {};
            keywordFilter["$or"] = [unitCodeFilter, unitNameFilter];

            var yearFilter = {};

            if (filter) {
                yearFilter = { year: filter.year };
            }

            var deletedFilter = { _deleted: false };

            var query = {};
            query["$and"] = [keywordFilter, yearFilter, deletedFilter];

            this.collection.distinct(
                "unit",
                query,
                function (err, result) {
                    resolve(result);
                }
            );
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
                            "unit.code": 1,
                        }
                    }
                ])
                .toArray(function (err, result) {
                    resolve(result);
                });
        });
    }

    getMonitoringRemainingEHXls(dataReport, query) {
        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            xls.options = {};
            xls.name = '';

            var units = [];
            for (var x = 0; x < dataReport.data.length; x++) {
              for (var y = 0; y < dataReport.data[x].items.length; y++) {
                var unit = {
                  code: dataReport.data[x].unit.code,
                  remainingEH: dataReport.data[x].items[y].remainingEH
                };
                var unitsTemp = units[y] ? units[y] : [];
                unitsTemp.push(unit);
                units[y] = unitsTemp;
              }
            }
            // console.log(units);
  
            var weeks = [];
            for (var x = 0; x < units.length; x++) {
              var headCount = 0;
              var remainingEH=0;
              for (var y = 0; y < units[x].length; y++) {
                headCount += Number(dataReport.data[y].items[x].operator);
                remainingEH += Number(dataReport.data[y].items[x].remainingEH);
              }
              var week = {
                week: "W" + (x + 1),
                units: units[x],
                headCount: headCount,
                eh:remainingEH
              };
              weeks.push(week);
            }

            for (var week of weeks) {
                var item = {};
                item["Unit"] = week.week;
                for (unit of week.units) {
                    item[unit.code] = unit.remainingEH;
                }
                item["Total Remaining EH"] = week.eh;
                item["Head Count"] = week.headCount;
                xls.data.push(item);
            }

            var border = {
                top: { style: 'thin', color: 'FF000000' },
                bottom: { style: 'thin', color: 'FF000000' },
                left: { style: 'thin', color: 'FF000000' },
                right: { style: 'thin', color: 'FF000000' },
            };

            var fgColor = function(color){
                return {
                    fgColor: {
                        rgb: color
                    }
                };
            };

            var styles = {
                header: {
                    fill: fgColor('FFCCCCCC'),
                    border: border,
                    alignment: {
                        horizontal: 'center'
                    },
                    font: {
                        bold: true
                    }
                },
                cell: {
                    fill: fgColor('FFFFFFFF'),
                    border: border
                },
                cellRed: {
                    fill: fgColor('FFFF0000'),
                    border: border
                },
                cellGreen: {
                    fill: fgColor('FF00FF00'),
                    border: border
                },
                cellYellow: {
                    fill: fgColor('FFFFFF00'),
                    border: border
                }
            };

            xls.options.specification = {};
            xls.options.specification["Unit"] = {
                displayName : "Unit",
                width: 50,
                headerStyle: styles.header,
                cellStyle: styles.cell
            };
            for (unit of week.units) {
                xls.options.specification[unit.code] = {
                    displayName : unit.code,
                    width: 100,
                    headerStyle: styles.header,
                    cellStyle : (value, row) => {
                        return (value > 0) ? styles.cellYellow :
                        (value < 0) ? styles.cellRed :
                        styles.cellGreen;
                    }
                };
            }
            if(!query.unit)
                xls.options.specification["Total Remaining EH"] = {
                    displayName : "Total Remaining EH",
                    width: 120,
                    headerStyle: styles.header,
                    cellStyle: styles.cell
                };
            xls.options.specification["Head Count"] = {
                displayName : "Head Count",
                width: 100,
                headerStyle: styles.header,
                cellStyle: styles.cell
            };

            xls.name = `Remaining EH Report ` + (query.unit ? `${query.unit}-` : ``) + `${query.year}.xlsx`;

            resolve(xls);
        });
    }

}
