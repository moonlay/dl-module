"use strict";
var helper = require("../../../helper");

var MonitoringSpecificationMachineManager = require("../../../../src/managers/production/finishing-printing/monitoring-specification-machine-manager");
var codeGenerator = require("../../../../src/utils/code-generator");

var machineType = require("../../master/machine-type-data-util");

class MonitoringSpecificationMachineDataUtil {

    getNewData() {
        return Promise.all([machineType.getNewTestData()])
            .then((results) => {
                var _machineType = results[0];
                var itemsArr = [];
                for (var machine of _machineType.indicators) {
                    var item = {
                        indicator: machine.indicator,
                        dataType: machine.dataType,
                        defaultValue: machine.defaultValue,
                        value: "",

                    }
                    itemsArr.push(item);
                }

                var data = {
                    code: `UT/MSM/${codeGenerator()}`,
                    date: new Date(),
                    time: "10.00",
                    machineTypeId: _machineType._id,
                    machineType: _machineType,
                    items: itemsArr

                };

                return Promise.resolve(data);
            });
    }

}

module.exports = new MonitoringSpecificationMachineDataUtil();
