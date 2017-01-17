"use strict";
var _getSert = require("../getsert");
var orderType = require("./order-type-data-util");
var generateCode = require("../../../src/utils/code-generator");

class ProcessTypeDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/process-type-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        return orderType.getTestData()
            .then(order => {

                var code = generateCode();

                var data = {
                    code: code,
                    orderTypeId: order._id,
                    orderType: order,
                    name: `name[${code}]`,
                    description: ""
                };
                return Promise.resolve(data);
            });
    }

    getTestData() {
        return orderType.getTestData()
            .then(order => {
                var data = {
                    code: "UT/PROCESS/01",
                    orderTypeId: order._id,
                    orderType: order,
                    name: "Solid",
                    description: ""
                };
                return this.getSert(data);
            });
    }
}

module.exports = new ProcessTypeDataUtil();
