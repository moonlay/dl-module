"use strict";
var _getSert = require("./getsert");
var generateCode = require("../../../src/utils/code-generator");

class VatDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/budget-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                name: data.name,
                rate: data.rate
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.Vat;
        var data = new Model();

        var code = generateCode();
        data.name = `Pasal 22[${code}]`;
        data.rate = 1.5;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            name: 'VAT UT',
            rate: 10,
            description: ''
        };
        return this.getSert(data);
    }
}
module.exports = new VatDataUtil();
