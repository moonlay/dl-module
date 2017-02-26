"use strict";
var helper = require("../../../helper");
var MonitoringEventManager = require("../../../../src/managers/production/finishing-printing/monitoring-event-manager");

var productionOrder = require("../../sales/production-order-data-util");
var machine = require("../../master/machine-data-util");

class MonitoringEventDataUtil {
    getNewData() {
        return Promise.all([productionOrder.getNewTestData(), machine.getTestData()])
            .then((results) => {
                var _productionOrder = results[0];
                var _selectedProductionOrderDetail = (_productionOrder.details && _productionOrder.details.length > 0) ? _productionOrder.details[0] : {};

                var _machine = results[1];
                var _machineEvent = _machine.machineEvents.length > 0 ? _machine.machineEvents[0] : {};
            
                var data = {
                    dateStart: new Date(),
                    dateEnd: new Date(),
                    timeInMillisStart: 12000,
                    timeInMillisEnd: 24000,
                    machineId: _machine._id,
                    machine: _machine,
                    productionOrderId: _productionOrder._id,
                    productionOrder: _productionOrder,
                    selectedProductionOrderDetail: _selectedProductionOrderDetail,
                    cartNumber: "Cart Number for UnitTest",
                    machineEvent: _machineEvent,
                    remark: "Unit Test"
                };
                return Promise.resolve(data);
            });
    }
    
    getNewTestData() {
        return helper
            .getManager(MonitoringEventManager)
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

module.exports = new MonitoringEventDataUtil();
