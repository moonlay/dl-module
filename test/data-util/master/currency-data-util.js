"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class CurrencyDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/currency-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").master.Currency;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.symbol = `symbol[${code}]`;
        data.rate = 1;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UTT",
            symbol: "Ut",
            rate: 1,
            description: "Unit test currency"
        };
        return this.getSert(data);
    }
}

module.exports = new CurrencyDataUtil();
