"use strict";
var _getSert = require("../getsert");
var machineDataUtil = require("./machine-data-util");
var ObjectId = require("mongodb").ObjectId;
var generateCode = require("../../../src/utils/code-generator");

class BadOutputDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/bad-output-reason-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                reason: data.reason
            };
        });
    }

    getNewData() {
       return Promise.all([machineDataUtil.getTestData()])
            .then((results) => {
                var _machine = results[0];

                var code = generateCode();

                var data = {
                    code : code,
                    reason : `reason ${code}`,
                    machines:[_machine]
                    };
                return Promise.resolve(data);
            });
    }
    
    getTestData() {
       return Promise.all([machineDataUtil.getTestData()])
            .then((results) => {
                var _machine = results[0];

                var code = generateCode();

                var dataReturn = {
                        reason: "Reason Unit Test",
                        code : code,
                        machines : [_machine]
                    };
                return this.getSert(dataReturn);
            });
    }
}
module.exports = new BadOutputDataUtil();