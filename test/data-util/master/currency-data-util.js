'use strict';
var _getSert = require('./getsert');

class CurrencyDataUtil {
    getSert(currency) {
        var CurrencyManager = require('../../../src/managers/master/currency-manager');
        return Promise.resolve(_getSert(currency, CurrencyManager, data => {
            return {
                code: data.code
            };
        }));
    }
    getTestData() {
        var testData = { 
            code: 'UT/Currency/01',
            symbol:'Rp',
            rate: 1,
            description:''
        };
        return Promise.resolve(this.getSert(testData));
    }
} 

module.exports = new CurrencyDataUtil();



