"use strict";

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var ProcessType = DLModels.master.ProcessType;
var FinishingPrintingDurationEstimation = DLModels.master.FinishingPrintingDurationEstimation;
var ProcessTypeManager = require('../master/process-type-manager');
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var generateCode = require("../../utils/code-generator");

module.exports = class DurationEstimationManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.FinishingPrintingDurationEstimation);
        this.processTypeManager = new ProcessTypeManager(db, user);
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
            var nameFilter = {
                "processType.name": {
                    "$regex": regex
                }
            };

            var areaFilter = {
                "areas.name": {
                    "$regex": regex
                }
            }
            keywordFilter["$or"] = [nameFilter, areaFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(process) {
        var errors = {};
        var valid = process;
        var getEstimationPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code,
            _deleted: false
        });
        var getProcessPromise = ObjectId.isValid(valid.processTypeId) ? this.processTypeManager.getSingleByIdOrDefault(new ObjectId(valid.processTypeId)) : Promise.resolve(null);

        // 2. begin: Validation.
        return Promise.all([getProcessPromise, getEstimationPromise])
            .then(results => {
                var _process = results[0];
                var _oldData = results[1];

                if (!valid.processTypeId)
                    errors["processTypeId"] = i18n.__("FPDurationEstimation.processTypeId.isRequired:%s is required", i18n.__("FPDurationEstimation.processTypeId._:Process Type"));//"code Jenis proses tidak boleh kosong";
                else if (!_process) {
                    errors["processTypeId"] = i18n.__("FPDurationEstimation.processTypeId.isRequired:%s is not exists", i18n.__("FPDurationEstimation.processTypeId._:Process Type"));
                }
                if (_oldData) {
                    errors["code"] = i18n.__("FPDurationEstimation.processTypeId.isExists:%s is already exists", i18n.__("FPDurationEstimation.processTypeId._:Process Type"));
                }
                if (!valid.areas || valid.areas.length === 0) {
                    errors["areas"] = i18n.__("FPDurationEstimation.areas.isRequired:%s is required", i18n.__("FPDurationEstimation.areas._:Areas"));
                }
                else {
                    var areaErrors = [];
                    for (var area of valid.areas) {
                        var areaError = {};
                        var listAreaName = ["PPIC", "PREPARING", "PRE TREATMENT", "DYEING", "PRINTING", "FINISHING", "QC"];
                        var index = listAreaName.find(name => name.trim().toLocaleLowerCase() === area.name.trim().toLocaleLowerCase())
                        if (area.name == "" || !area.name) {
                            areaError["name"] = i18n.__("FPDurationEstimation.areas.name.isRequired:%s is required", i18n.__("FPDurationEstimation.areas.name._:Name"));
                        } else if (index === -1) {
                            areaError["name"] = i18n.__("FPDurationEstimation.areas.name.isNoExists:%s is no exists", i18n.__("FPDurationEstimation.areas.name._:Name"));
                        }
                        if (area.duration <= 0 || !area.duration) {
                            areaError["duration"] = i18n.__("FPDurationEstimation.areas.duration.isRequired:%s is required", i18n.__("FPDurationEstimation.areas.duration._:Duration"));
                        } else {
                            area.duration = Number(area.duration)
                        }
                        areaErrors.push(areaError);
                    }
                    for (var areaError of areaErrors) {
                        if (Object.getOwnPropertyNames(areaError).length > 0) {
                            errors.areas = itemErrors;
                            break;
                        }
                    }
                }
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new FinishingPrintingDurationEstimation(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _beforeInsert(data) {
        data.code = generateCode();
        data._createdDate = new Date();
        return Promise.resolve(data);
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.FinishingPrintingDurationEstimation}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.FinishingPrintingDurationEstimation}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
