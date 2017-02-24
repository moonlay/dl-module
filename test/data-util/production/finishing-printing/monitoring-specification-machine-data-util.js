"use strict";
var helper = require("../../../helper");

var MonitoringSpecificationMachineManager = require("../../../../src/managers/production/finishing-printing/monitoring-specification-machine-manager");
var codeGenerator = require("../../../../src/utils/code-generator");

var productionOrder = require("../../sales/production-order-data-util");
var machine = require("../../master/machine-data-util");

class MonitoringSpecificationMachineDataUtil {

    getNewData() {
        return Promise.all([machine.getTestData(), productionOrder.getNewTestData()])
            .then((results) => {
                var _machine = results[0];
                var _productionOrder = results[1];
                var itemsArr = [];
                for (var machine of _machine.machineType.indicators) {
                    var item = {};
                    item = {
                        indicator: machine.indicator ? machine.indicator : "",
                        dataType: machine.dataType ? machine.dataType : "",
                        defaultValue: machine.defaultValue ? machine.defaultValue : "",
                        value: machine.dataType == "range (use '-' as delimiter)" ? 5 : "a",
                        satuan: "test satuan",

                    }
                    itemsArr.push(item);
                }

                var data = {
                    code: `UT/MSM/${codeGenerator()}`,
                    date: new Date(),
                    time: "10.00",
                    machineId: _machine._id,
                    machine: _machine,
                    productionOrderId: _productionOrder._id,
                    productionOrder: _productionOrder,
                    cartNumber: "test",
                    items: itemsArr

                };

                return Promise.resolve(data);
            });
    }

    getNewDataItems() {
        return Promise.all([machine.getTestData(), productionOrder.getNewTestData()])
            .then((results) => {
                var _machine = results[0];
                var _productionOrder = results[1];
                var itemsArr = [];
                for (var machine of _machine.machineType.indicators) {
                    var item = {};

                    item = {
                        indicator: machine.indicator ? machine.indicator : "",
                        dataType: machine.dataType ? machine.dataType : "",
                        defaultValue: machine.defaultValue ? machine.defaultValue : "",
                        value: "",
                        satuan: "",

                    }
                    itemsArr.push(item);
                }

                var data = {
                    code: `UT/MSM/${codeGenerator()}`,
                    date: new Date(),
                    time: "10.00",
                    machineId: _machine._id,
                    machine: _machine,
                    productionOrderId: _productionOrder._id,
                    productionOrder: _productionOrder,
                    cartNumber: "test",
                    items: itemsArr

                };

                return Promise.resolve(data);
            });
    }

}

module.exports = new MonitoringSpecificationMachineDataUtil();
