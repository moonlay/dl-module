"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class DealTrackingReasonDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/deal-tracking-reason-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.DealTrackingReason;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.reason = `reason[${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT/DLReason/01",
            reason: "Reason Test"
        };
        return this.getSert(data);
    }
}
module.exports = new DealTrackingReasonDataUtil();
