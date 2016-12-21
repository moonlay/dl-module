"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class AccountBankDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/account-bank-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.AccountBank;
        var data = new Model();

        var code = generateCode();

        data.bankName = `Bank Name [${code}]`;
        data.bankAddress = `Bank Address [${code}]`;
        data.accountName = `Account Name [${code}]`;
        data.accountNumber = `Account Number [${code}]`;
        data.swiftCode = `Swift Code [${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            bankName: 'PT Bank Unit Test',
            bankAddress: 'Cab. Solo',
            accountName: 'Unit Test',
            accountNumber: '111-2222-33',
            swiftCode: 'SC/01/11'
        };
        return this.getSert(data);
    }
}
module.exports = new AccountBankDataUtil();