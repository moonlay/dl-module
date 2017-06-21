"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var Step = DLModels.master.Step;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class StepManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Step);
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
            keywordFilter = {
                "process": {
                    "$regex": regex
                }
            };
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(step) {
        var errors = {};
        var valid = step;
        // 1. begin: Declare promises.
        var getProcessPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            process: valid.process
        });
        // 2. begin: Validation.
        return Promise.all([getProcessPromise])
            .then(results => {
                var _module = results[0];

                if (!valid.process || valid.process == "")
                    errors["process"] = i18n.__("Step.process.isRequired:%s is required", i18n.__("Step.process._:Process")); // "Process harus diisi";
                else if (_module) {
                    errors["process"] = i18n.__("Step.process.isExists:%s is already exists", i18n.__("Step.process._:Process")); //"Process sudah ada";
                }
                // if(!valid.itemMonitoring || valid.itemMonitoring.length < 1)
                //     errors["itemMonitoring"] = i18n.__("Step.itemMonitoring.isRequired:%s is required", i18n.__("Step.itemMonitoring._:ItemMonitoring")); //"minimal harus ada 1 detail";

                if (!valid.alias || valid.alias == "")
                    errors["alias"] = i18n.__("Step.alias.isRequired:%s is required", i18n.__("Step.alias._:Alias")); // "Process harus diisi";

                if (!valid.stepIndicators || valid.stepIndicators.length < 1) {
                    errors["stepIndicatorsArr"] = i18n.__("Step.stepIndicators.isRequired:%s is required", i18n.__("Step.stepIndicators._:StepIndicators")); //"minimal harus ada 1 detail";
                }

                else {

                    var itemErrors = [];
                    var valueArr = valid.stepIndicators.map(function (stepIndicator) { return stepIndicator.name });

                    var itemDuplicateErrors = new Array(valueArr.length);
                    valueArr.some(function (item, idx) {
                        var itemError = {};
                        if (valueArr.indexOf(item) != idx) {
                            itemError["name"] = i18n.__("stepIndicators.name.isDuplicate:%s is duplicate", i18n.__("stepIndicators.name._:name")); //"Nama indicator tidak boleh sama";
                        }
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            itemDuplicateErrors[valueArr.indexOf(item)] = itemError;
                            itemDuplicateErrors[idx] = itemError;
                        } else {
                            itemDuplicateErrors[idx] = itemError;
                        }
                    });
                    for (var stepIndicator of valid.stepIndicators) {
                        var itemError = {};
                        var _index = valid.stepIndicators.indexOf(stepIndicator);
                        if (!stepIndicator.name) {
                            itemError["name"] = i18n.__("Step.stepIndicators.name.isRequired:%s is required", i18n.__("stepIndicators.name._:name")); //"indicator tidak boleh kosong";
                        } else if (Object.getOwnPropertyNames(itemDuplicateErrors[_index]).length > 0) {
                            Object.assign(itemError, itemDuplicateErrors[_index]);
                        }

                        itemErrors.push(itemError);
                    }

                    for (var itemError of itemErrors) {
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            errors.stepIndicators = itemErrors;
                            break;
                        }
                    }
                }


                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                if (!valid.stamp) {
                    valid = new Step(valid);
                }
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Step}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Step}_process`,
            key: {
                process: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
};