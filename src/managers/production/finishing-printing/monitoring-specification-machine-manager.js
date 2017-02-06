'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var MonitoringSpecificationMachine = DLModels.production.finishingPrinting.MonitoringSpecificationMachine;
var MachineTypeManager = require('../../master/machine-type-manager');
var MachineManager = require('../../master/machine-manager');
var CodeGenerator = require('../../../utils/code-generator');
var BaseManager = require('module-toolkit').BaseManager;

var i18n = require('dl-i18n');

module.exports = class MonitoringSpecificationMachineManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.production.finishingPrinting.collection.MonitoringSpecificationMachine);

        this.machineTypeManager = new MachineTypeManager(db, user);
        // this.machineManager= new MachineManager(db,user);

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
                'code': {
                    '$regex': regex
                }
            };
            var dateFilter = {
                'date': {
                    '$regex': regex
                }
            };

            keywordFilter['$or'] = [codeFilter, dateFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = CodeGenerator();
        // data._active = true;
        return Promise.resolve(data);
    }


    _validate(monitoringSpecificationMachine) {
        var errors = {};
        // return new Promise((resolve, reject) => {
        var valid = monitoringSpecificationMachine;
        // 1. begin: Declare promises.
        var getMonitoringSpecificationMachinePromise = this.collection.singleOrDefault({

            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code,
        });

        var getMachineType = ObjectId.isValid(valid.machineTypeId) ? this.machineTypeManager.getSingleByIdOrDefault(new ObjectId(valid.machineTypeId)) : Promise.resolve(null);
        // var getMachine = ObjectId.isValid(valid.machineTypeId) ? this.machineManager.getSingleByIdOrDefault(new ObjectId(valid.machineTypeId)) : Promise.resolve(null);



        return Promise.all([getMonitoringSpecificationMachinePromise, getMachineType])
            // return Promise.all([getMonitoringSpecificationMachinePromise, getMachine])
            .then(results => {

                var _monitoringSpecificationMachine = results[0];
                var _machineType = results[1];



                if (_monitoringSpecificationMachine)
                    errors["code"] = i18n.__("MonitoringSpecificationMachine.code.isRequired:%s is not exists", i18n.__("MonitoringSpecificationMachine.code._:Code"));

                if (!valid.date || valid.date == "" || valid.date == "undefined")
                    errors["date"] = i18n.__("MonitoringSpecificationMachine.date.isRequired:%s is required", i18n.__("MonitoringSpecificationMachine.date._:Date")); //"Date monitoring tidak boleh kosong";

                if (!valid.time || valid.time == "" || valid.time == "undefined")
                    errors["time"] = i18n.__("MonitoringSpecificationMachine.time.isRequired:%s is required", i18n.__("MonitoringSpecificationMachine.time._:Time")); //"Time monitoring tidak boleh kosong";

                if (!_machineType)
                    errors["machineType"] = i18n.__("MonitoringSpecificationMachine.machineType.name.isRequired:%s is not exists", i18n.__("MonitoringSpecificationMachine.machineType.name._:MachineType")); //"machineType tidak boleh kosong";
                else if (!valid.machineType._id)
                    errors["machineType"] = i18n.__("MonitoringSpecificationMachine.machineType.name.isRequired:%s is required", i18n.__("MonitoringSpecificationMachine.machineType.name._:MachineType")); //"machineType tidak boleh kosong";
                // else {
                //     var errorIndicators = [];

                //     for (var indicator of valid.machineType.indicators) {
                //         var errorIndicator = {};
                //         if (indicator.dataType == "range (use '-' as delimiter)") {
                //             var rangeValues = indicator.value.split("-");
                //             if (rangeValues.length == 0) {
                //                 errorIndicator["value"] = i18n.__("MonitoringSpecificationMachine.machineType.indicators.value.isIncorrect:%s delimiter is incorrect", i18n.__("MonitoringSpecificationMachine.machineType.indicators.value._:value")); //"value tidak boleh kosong";

                //             } else if (rangeValues.length == 2) {
                //                 if (!parseInt(rangeValues[0]) || !parseInt(rangeValues[1])) {
                //                     errorIndicator["value"] = i18n.__("MonitoringSpecificationMachine.machineType.indicators.value.isIncorrect:%s is incorrect", i18n.__("MonitoringSpecificationMachine.machineType.indicators.value._:value")); //"value tidak boleh kosong";
                //                 } else if (parseInt(rangeValues[0]) >= parseInt(rangeValues[1])) {
                //                     errorIndicator["value"] = i18n.__("MonitoringSpecificationMachine.machineType.indicators.value.isIncorrect:%s 1st value must less than 2nd value", i18n.__("MonitoringSpecificationMachine.machineType.indicators.value._:value")); //"value tidak boleh kosong";
                //                 }

                //             } else {
                //                 errorIndicator["value"] = i18n.__("MonitoringSpecificationMachine.machineType.indicators.value.isIncorrect:%s range is incorrect", i18n.__("MonitoringSpecificationMachine.machineType.indicators.value._:value")); //"value tidak boleh kosong";
                //             }

                //         }
                //     }
                // }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if (!valid.stamp)
                    valid = new MonitoringSpecificationMachine(valid);

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);

            });

    }


    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.finishingPrinting.collection.MonitoringSpecificationMachine}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.production.finishingPrinting.collection.MonitoringSpecificationMachine}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}