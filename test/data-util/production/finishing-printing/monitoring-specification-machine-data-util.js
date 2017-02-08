"use strict";
var helper = require("../../../helper");

var MonitoringSpecificationMachineManager = require("../../../../src/managers/production/finishing-printing/monitoring-specification-machine-manager");
var codeGenerator = require("../../../../src/utils/code-generator");

// var machineType = require("../../master/machine-type-data-util");
var machine = require("../../master/machine-data-util");

class MonitoringSpecificationMachineDataUtil {

    getNewData() {
        return Promise.all([machine.getTestData()])
            .then((results) => {
                var _machine = results[0];
                var itemsArr = [];
                for (var machine of _machine.machineType.indicators) {
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
                    machineId: _machine._id,
                    machine: _machine,
                    items: itemsArr

                };

                return Promise.resolve(data);
            });
    }

}

module.exports = new MonitoringSpecificationMachineDataUtil();
