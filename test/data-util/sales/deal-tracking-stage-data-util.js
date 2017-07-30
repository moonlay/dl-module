"use strict";
var helper = require('../../helper');
var DealTrackingStageManager = require('../../../src/managers/sales/deal-tracking-stage-manager');
var generateCode = require("../../../src/utils/code-generator");
var dealTrackingBoard = require("./deal-tracking-board-data-util");

class DealTrackingStageDataUtil {
    getNewData() {
        return dealTrackingBoard.getTestData()
            .then((result) => {
                var Model = require('dl-models').sales.DealTrackingStage;
                var data = new Model();

                var code = generateCode();

                data.code = code;
                data.boardId = result._id;
                data.name = `name[${code}]`;
                data.deals = [];

                return Promise.resolve(data);
            });
    }

    getTestData() {
        return helper
            .getManager(DealTrackingStageManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}
module.exports = new DealTrackingStageDataUtil();
