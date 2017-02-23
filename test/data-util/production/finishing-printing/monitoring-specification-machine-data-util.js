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
                        indicator: machine.indicator,
                        dataType: machine.dataType,
                        defaultValue: machine.defaultValue,
                        value: machine.dataType == "range (use '-' as delimiter)" ? 5 : "",
                        satuan: "test",

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
                    cartNumber: "Cart Number for UnitTest",
                    items: itemsArr

                };

                return Promise.resolve(data);
            });
    }

    getNewTestData() {
        return helper
            .getManager(MonitoringSpecificationMachineManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            manager.getSingleById(id)
                        });
                });
            });
    }

}

module.exports = new MonitoringSpecificationMachineDataUtil();
