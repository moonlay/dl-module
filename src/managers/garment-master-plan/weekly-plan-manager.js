"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var generateCode = require("../../utils/code-generator");
var map = DLModels.map;
var WeeklyPlan = DLModels.garmentMasterPlan.WeeklyPlan;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var UnitManager = require('../master/unit-manager');

module.exports = class ContactManager extends BaseManager {
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
            var unitFilter = {
                "unit.name": {
                    "$regex": regex
                }
            };
            var yearFilter = {
                "year": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [unitFilter, yearFilter];
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
            unitId: new ObjectId(valid.unitId),
            year: valid.year,
            _deleted: false
        });

        var getUnit = valid.unit && ObjectId.isValid(valid.unit._id) ? this.unitManager.getSingleByIdOrDefault(valid.unit._id) : Promise.resolve(null);

        // 2. begin: Validation.
        return Promise.all([getWeeklyPlanPromise, getUnit])
            .then(results => {
                var duplicateWeeklyPlan = results[0];
                var unit = results[1];

                if (duplicateWeeklyPlan) {
                    errors["unit"] = i18n.__("WeeklyPlan.unit.isExists:%s is already exists", i18n.__("WeeklyPlan.unit._:Weekly Plan"));
                }
                else if (!valid.unit || valid.unit == '')
                    errors["unit"] = i18n.__("WeeklyPlan.unit.isRequired:%s is required", i18n.__("WeeklyPlan.unit._:Unit"));
                else if (!unit)
                    errors["unit"] = i18n.__("WeeklyPlan.unit.notFound:%s not found", i18n.__("WeeklyPlan.unit._:Unit"));

                var current_year = new Date().getFullYear() + 10;
                if (!valid.year) {
                    errors["year"] = i18n.__("WeeklyPlan.year.isRequired:%s is required", i18n.__("WeeklyPlan.year._:Year"));
                }
                else if (isNaN(valid.year)) {
                    errors["year"] = i18n.__("WeeklyPlan.year.mustNumber:%s must number", i18n.__("WeeklyPlan.year._:Year"));
                }
                else if ((valid.year < 1920) || (valid.year > current_year)) {
                    errors["year"] = i18n.__("WeeklyPlan.year.outOfRage:%s is out of range year", i18n.__("WeeklyPlan.year._:Year"));
                }

                if (valid.items && valid.items.length <= 0) {
                    errors["items"] = i18n.__("WeeklyPlan.items.isRequired:%s is required", i18n.__("WeeklyPlan.items._:Item"));
                }
                else {
                    var itemErrors = [];
                    for (var item of valid.items) {
                        var itemError = {};
                        var _index = valid.items.indexOf(item);
                        if (!item.month && item.month > 11 && item.month < 0) {
                            itemError["month"] = i18n.__("WeeklyPlan.items.month.isRequired:%s is required", i18n.__("WeeklyPlan.items.month._:Month"));
                        } else if (item.startDate.getMonth() != item.month || item.endDate.getMonth() != item.month) {
                            itemError["month"] = i18n.__("WeeklyPlan.items.month.isOutOfRange:%s is out of range", i18n.__("WeeklyPlan.items.month._:Month"));
                        }
                        itemErrors.push(itemError);
                    }

                    for (var itemError of itemErrors) {
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            errors.items = itemErrors;
                            break;
                        }
                    }

                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid.unitId = new ObjectId(valid.unit._id);

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

        var unitIndex = {
            name: `ix_${map.garmentMasterPlan.collection.WeeklyPlan}_unit`,
            key: {
                "unit.code": 1
            }
        };

        return this.collection.createIndexes([dateIndex, unitIndex]);
    }
}
