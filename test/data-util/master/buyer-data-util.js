'use strict';
var _getSert = require('./getsert');

class BuyerDataUtil {
    getSert(unit) {
        var BuyerManager = require('../../../src/managers/master/buyer-manager');
        return Promise.resolve(_getSert(unit, BuyerManager, data => {
            return {
                code: data.code
            };
        }));
    }
    getTestData() {
        var testData = {
            code: 'UT/BUY/01',
            name: 'Buyer 01',
            address: '152 La Sierra Street Land O Lakes, FL 34639',
            country: 'US',
            contact: 'Mr. John Doe.',
            tempo: ''
        };
        return Promise.resolve(this.getSert(testData));
    }
}
module.exports = new BuyerDataUtil();
