"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");
var CurrencyDataUtil = require("./currency-data-util");

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
         return CurrencyDataUtil.getTestData()
            .then(currency => {
                var Model = require('dl-models').master.AccountBank;
                var data = new Model();

                var code = generateCode();

                data.bankName = `Bank Name [${code}]`;
                data.bankAddress = `Bank Address [${code}]`;
                data.accountName = `Account Name [${code}]`;
                data.accountNumber = `Account Number [${code}]`;
                data.swiftCode = `Swift Code [${code}]`;
                data.currencyId=currency._id;
                data.currency=currency;

                return Promise.resolve(data);
            });
    }

    getTestData() {
        return CurrencyDataUtil.getTestData()
            .then(currency => {
                var data = {
                    bankName: 'PT Bank Unit Test',
                    bankAddress: 'Cab. Solo',
                    accountName: 'Unit Test',
                    accountNumber: '111-2222-33',
                    swiftCode: 'SC/01/11',
                    currencyId: currency._id,
                    currency: currency
                };
                return this.getSert(data);
            });
    }
}
module.exports = new AccountBankDataUtil();