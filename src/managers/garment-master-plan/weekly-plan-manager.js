"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var generateCode = require("../../utils/code-generator");
var map = DLModels.map;
var WeeklyPlan = DLModels.garmentMasterPlan.WeeklyPlan;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class ContactManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.WeeklyPlan);
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
                "year": {
                    "$regex": regex
                }
            };
            keywordFilter = yearFilter;
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
            _deleted: false
        });
        // 2. begin: Validation.
        return Promise.all([getWeeklyPlanPromise])
            .then(results => {
                var duplicateWeeklyPlan = results[0];

                if (duplicateWeeklyPlan) {
                    errors["year"] = i18n.__("WeeklyPlan.year.isExists:%s is already exists", i18n.__("WeeklyPlan.year._:Weekly Plan"));
                }
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


                if (valid.items && valid.items.length > 0) {
                    var itemErrors = [];
                    for (var item of valid.items) {
                        var itemError = {};
                        if (!item.month && item.month > 11 && item.month < 0) {
                            itemError["month"] = i18n.__("WeeklyPlan.items.month.isRequired:%s is required", i18n.__("WeeklyPlan.items.month._:Month"));
                        } else if (item.startDate.getMonth() != item.month && item.endDate.getMonth() != item.month) {
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
                else {
                    errors["items"] = i18n.__("WeeklyPlan.items.isRequired:%s is required", i18n.__("WeeklyPlan.items._:Item"));
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
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
            name: `ix_${map.garmentMasterPlan.collection.WeeklyPlan}_year`,
            key: {
                "year": 1
            }
        };

        return this.collection.createIndexes([dateIndex]);
    }
}
