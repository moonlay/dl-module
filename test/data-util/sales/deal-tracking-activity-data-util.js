"use strict";
var helper = require('../../helper');
var DealTrackingActivityManager = require('../../../src/managers/sales/deal-tracking-activity-manager');
var generateCode = require("../../../src/utils/code-generator");
var dealTrackingDeal = require("./deal-tracking-deal-data-util");
var account = require("../auth/account-data-util.js");

class DealTrackingActivityDataUtil {
    getNewData() {
        return dealTrackingDeal.getTestData()
            .then((result) => {
                var Model = require('dl-models').sales.DealTrackingActivity;
                var data = new Model();

                var code = generateCode();

                data.code = code;
                data.dealId = result._id;
                data.type = "ADD";
                data.field = {};

                return Promise.resolve(data);
            });
    }

    getTestDataTaskType() {
        return helper
            .getManager(DealTrackingActivityManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return account.getTestData()
                        .then((result) => {
                            data.type = "TASK";
                            data.field = {
                                title: "Unit Test Title",
                                notes: "Unit Test Notes",
                                assignedTo: result,
                                dueDate: "2017-26-07 03:00",
                                status: false
                            };

                            return manager.create(data)
                                .then((id) => manager.getSingleById(id));
                        })
                });
            });
    }

    getTestDataNotesType() {
        return helper
            .getManager(DealTrackingActivityManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return account.getTestData()
                        .then((result) => {
                            data.type = "NOTES";
                            data.field = {
                                notes: "Unit Test Notes",
                                attachments: []
                            };

                            return manager.create(data)
                                .then((id) => manager.getSingleById(id));
                        })
                });
            });
    }

    getTestData() {
        return helper
            .getManager(DealTrackingActivityManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}
module.exports = new DealTrackingActivityDataUtil();
