'use strict'
var helper = require("../../../helper");
var InspectionLotColorManager = require('../../../../src/managers/production/finishing-printing/inspection-lot-color-manager');
var kanbanDataUtil = require('./kanban-data-util');
var moment = require('moment');

class InspectionLotColorDataUtil {
    getNewData() {
        return Promise.all([kanbanDataUtil.getNewTestData()])
                    .then(kanban => {
                        var _kanban = kanban[0];
                        var dateNowString = '2017-01-01';
                        var data = {};
                        data = {
                            kanbanId : _kanban._id,
                            kanban : _kanban,
                            date : dateNowString,
                            items : [
                                {
                                    pcsNo : "1",
                                    lot : "1",
                                    status : 'OK'
                                },
                                {
                                    pcsNo : "2",
                                    lot : "2",
                                    status : 'Not OK'
                                }
                            ]
                        };
                        return Promise.resolve(data);
                    });
    }
    
    getNewTestData() {
        return helper
            .getManager(InspectionLotColorManager)
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
module.exports = new InspectionLotColorDataUtil();