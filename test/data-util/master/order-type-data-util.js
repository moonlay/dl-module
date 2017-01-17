"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class OrderTypeDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/order-type-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").master.OrderType;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `Ordername [${code}]`;
        data.remark = `remark [${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code : "ORDTP-UT-01",
            name: "RFD",
            remark:"remark for UT"
        };
        return this.getSert(data);
    }
}

module.exports = new OrderTypeDataUtil();
