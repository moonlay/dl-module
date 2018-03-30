'use strict'
var helper = require("../../../helper");
var DailyOperationManager = require('../../../../src/managers/production/finishing-printing/daily-operation-manager');
var codeGenerator = require('../../../../src/utils/code-generator');
var kanbanDataUtil = require('./kanban-data-util');
var machineDataUtil = require('../../master/machine-data-util');
var badOutputReasonDataUtil = require('../../master/bad-output-reason-data-util');
var moment = require('moment');

class DailyOperationDataUtil {
    getNewData(type) {
        return Promise.all([kanbanDataUtil.getNewTestData()])
            .then(kanban => {
                var _kanban = kanban[0];
                return Promise.all([machineDataUtil.getTestData()])
                    .then((machine) => {
                        return badOutputReasonDataUtil.getTestData()
                            .then(reason => {
                                var dailyType = type ? type : "input";
                                var _machine = machine[0];
                                var tempStep = {};
                                for (var a of _machine.steps) {
                                    tempStep = a.step;
                                    break;
                                }
                                var code = codeGenerator();
                                var dateNow = new Date();
                                var dateNowString = '2017-01-01';
                                var data = {};
                                if (dailyType === "input") {
                                    data = {
                                        kanbanId: _kanban._id,
                                        kanban: _kanban,
                                        shift: `shift ${code}`,
                                        machineId: _machine._id,
                                        machine: _machine,
                                        stepId: tempStep._id,
                                        step: tempStep,
                                        dateInput: dateNowString,
                                        timeInput: 10000,
                                        input: 20,
                                        type: "input"
                                    };
                                } else {
                                    data = {
                                        kanbanId: _kanban._id,
                                        kanban: _kanban,
                                        shift: `shift ${code}`,
                                        machineId: _machine._id,
                                        machine: _machine,
                                        stepId: tempStep._id,
                                        step: tempStep,
                                        dateOutput: dateNowString,
                                        timeOutput: 12000,
                                        goodOutput: 18,
                                        badOutput: 2,
                                        type: "output",
                                        badOutputReasons: [{
                                            length: 2,
                                            description: "Rusak",
                                            action: "Digudangkan",
                                            badOutputReasonId: reason._id,
                                            badOutputReason: reason,
                                            machineId: _machine._id,
                                            machine: _machine
                                        }]
                                    };
                                }
                                return Promise.resolve(data);
                            });
                    });
            });
    }

    getWhiteOrderTypeData(type) {
        return Promise.all([kanbanDataUtil.getNewWhiteOrderTypeData(), machineDataUtil.getTestData(), badOutputReasonDataUtil.getTestData()])
            .then((results) => {
                var _kanban = results[0];
                var dailyType = type ? type : "input";
                var _machine = results[1];
                var reason = results[2];
                var tempStep = {};

                for (var a of _machine.steps) {
                    tempStep = a.step;
                    break;
                }

                var code = codeGenerator();
                var dateNow = new Date();
                var dateNowString = '2017-01-01';
                var data = {};

                if (dailyType === "input") {
                    data = {
                        kanbanId: _kanban._id,
                        kanban: _kanban,
                        shift: `shift ${code}`,
                        machineId: _machine._id,
                        machine: _machine,
                        stepId: tempStep._id,
                        step: tempStep,
                        dateInput: dateNowString,
                        timeInput: 10000,
                        input: 20,
                        type: "input"
                    };
                } else {
                    data = {
                        kanbanId: _kanban._id,
                        kanban: _kanban,
                        shift: `shift ${code}`,
                        machineId: _machine._id,
                        machine: _machine,
                        stepId: tempStep._id,
                        step: tempStep,
                        dateOutput: dateNowString,
                        timeOutput: 12000,
                        goodOutput: 20,
                        badOutput: 0,
                        type: "output",
                    };
                }
                return Promise.resolve(data);
            });
    }

    getPrintingOrderTypeData(type) {
        return Promise.all([kanbanDataUtil.getNewPrintingOrderTypeData(), machineDataUtil.getTestData(), badOutputReasonDataUtil.getTestData()])
            .then((results) => {
                var _kanban = results[0];
                var dailyType = type ? type : "input";
                var _machine = results[1];
                var reason = results[2];
                var tempStep = {};

                for (var a of _machine.steps) {
                    tempStep = a.step;
                    break;
                }

                var code = codeGenerator();
                var dateNow = new Date();
                var dateNowString = '2017-01-01';
                var data = {};

                if (dailyType === "input") {
                    data = {
                        kanbanId: _kanban._id,
                        kanban: _kanban,
                        shift: `shift ${code}`,
                        machineId: _machine._id,
                        machine: _machine,
                        stepId: tempStep._id,
                        step: tempStep,
                        dateInput: dateNowString,
                        timeInput: 13000,
                        input: 20,
                        type: "input"
                    };
                } else {
                    data = {
                        kanbanId: _kanban._id,
                        kanban: _kanban,
                        shift: `shift ${code}`,
                        machineId: _machine._id,
                        machine: _machine,
                        stepId: tempStep._id,
                        step: tempStep,
                        dateOutput: dateNowString,
                        timeOutput: 15000,
                        goodOutput: 20,
                        badOutput: 0,
                        type: "output",
                    };
                }
                return Promise.resolve(data);
            });
    }

    getNewWhiteOrderTypeData(type) {
        return helper
            .getManager(DailyOperationManager)
            .then((manager) => {
                var a = type ? type : "input";
                return this.getWhiteOrderTypeData(a).then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }

    getNewPrintingOrderTypeData(type) {
        return helper
            .getManager(DailyOperationManager)
            .then((manager) => {
                var a = type ? type : "input";
                return this.getPrintingOrderTypeData(a).then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }

    getNewTestData(type) {
        return helper
            .getManager(DailyOperationManager)
            .then((manager) => {
                var a = type ? type : "input";
                return this.getNewData(a).then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }
}
module.exports = new DailyOperationDataUtil();
