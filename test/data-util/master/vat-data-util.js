'use strict';
var _getSert = require('./getsert');

class VatDataUtil {
    getSert(vat) {
        var VatManager = require('../../../src/managers/master/vat-manager');
        return Promise.resolve(_getSert(vat, VatManager, data => {
            return {
                name: data.name
            };
        }));
    }
     getTestData() {
        var testData = { 
            name: 'Vat 01',
            rate: 1,
            description:''
        };
         return Promise.resolve(this.getSert(testData));
    }
}
module.exports = new VatDataUtil();

