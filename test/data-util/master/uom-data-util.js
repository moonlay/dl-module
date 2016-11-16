'use strict';
var _getSert = require('./getsert');

class UomDataUtil {
    getSert(uom) {
        var UomManager = require('../../../src/managers/master/uom-manager');
        return Promise.resolve(_getSert(uom, UomManager, data => {
            return {
                unit: data.unit
            };
        }));
    }
    getTestData() {
        var testData = {
            unit: 'PCS'
        };
        return Promise.resolve(this.getSert(testData));
    }
}
module.exports = new UomDataUtil();
