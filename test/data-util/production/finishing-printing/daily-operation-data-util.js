'use strict'
var helper = require("../../../helper");
var DailyOperationManager = require('../../../../src/managers/production/finishing-printing/daily-operation-manager');
var codeGenerator = require('../../../../src/utils/code-generator');
var kanbanDataUtil = require('./kanban-data-util');
var machineDataUtil = require('../../master/machine-data-util');
var moment = require('moment');

class DailyOperationDataUtil {
    getNewData() {
        return Promise.all([kanbanDataUtil.getNewTestData()])
                    .then(kanban => {
                        var _kanban = kanban[0];
                        return Promise.all([machineDataUtil.getTestData()])
                                .then((machine) => {
                                    var _machine = machine[0];
                                    var dataSteps = [];
                                    var code = codeGenerator();
                                    var dateNow = new Date();
                                    var dateNowString = moment(dateNow).format('YYYY-MM-DD');
                                    var data = {
                                        kanbanId : _kanban._id,
                                        kanban : _kanban,
                                        shift : `shift ${code}`,
                                        machineId : _machine._id,
                                        machine : _machine,
                                        dateInput : dateNowString,
                                        timeInput : 10000,
                                        input : 20,
                                        dateOutput : dateNowString,
                                        timeOutput : 12000,
                                        goodOutput : 18,
                                        badOutput : 2,
                                        badOutputDescription : code
                                    };
                                    return Promise.resolve(data);
                                });
                    });
    }
    
    getNewTestData() {
        return helper
            .getManager(DailyOperationManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                            });
                });
            });
    }
}
module.exports = new DailyOperationDataUtil();
