"use strict";
var helper = require('../../helper');
var DealTrackingBoardManager = require('../../../src/managers/sales/deal-tracking-board-manager');
var generateCode = require("../../../src/utils/code-generator");
var currency = require("../master/currency-data-util");

class DealTrackingBoardDataUtil {
    getNewData() {
        return currency.getTestData()
            .then((results) => {
                var Model = require('dl-models').sales.DealTrackingBoard;
                var data = new Model();

                var code = generateCode();

                data.code = code;
                data.title = `title[${code}]`;
                data.currencyId = results._id;
                data.currency = results;

                return Promise.resolve(data);
            });
    }

    getTestData() {
        return helper
            .getManager(DealTrackingBoardManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}
module.exports = new DealTrackingBoardDataUtil();
