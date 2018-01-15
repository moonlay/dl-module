"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class TermOfPaymentDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/term-of-payment-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.TermOfPayment;
        var data = new Model();

        var code = generateCode();
        data.code = code;
        data.termOfPayment = `termOfPayment[${code}]`;
        data.isExport=true;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: 'UT/ToP/01',
            termOfPayment: 'TermOfPayment 01',
            isExport:false
        };
        return this.getSert(data);
    }
}
module.exports = new TermOfPaymentDataUtil();
