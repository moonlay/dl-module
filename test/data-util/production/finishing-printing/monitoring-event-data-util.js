"use strict";
var helper = require("../../../helper");
var MonitoringEventManager = require("../../../../src/managers/production/finishing-printing/monitoring-event-manager");

var productionOrder = require("../../sales/production-order-data-util");
var machine = require("../../master/machine-data-util");
var monitoringEventType = require("../../master/monitoring-event-type-data-util");

class MonitoringEventDataUtil {
    getNewData() {
        return Promise.all([productionOrder.getNewData(), machine.getTestData(), monitoringEventType.getTestData(), monitoringEventType.getTestData2()])
            .then((results) => {
                var productionOrder = results[0];
                var machine = results[1];
                var monitoringEventType01 = results[2];
                var monitoringEventType02 = results[3];

                var data = {
                    dateStart: new Date(),
                    dateEnd: new Date(),
                    timeInMillisStart: 12000,
                    timeInMillisEnd: 24000,
                    machineId: machine._id,
                    machine: machine,
                    productionOrder: productionOrder,
                    monitoringEventTypeId: monitoringEventType01._id,
                    monitoringEventType: monitoringEventType01,
                    remark: ""
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
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}

module.exports = new MonitoringEventDataUtil();
