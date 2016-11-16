'use strict';
var _getSert = require('./getsert');

class SupplierDataUtil {
    getSert(unit) {
        var SupplierManager = require('../../../src/managers/master/supplier-manager');
        return Promise.resolve(_getSert(unit, SupplierManager, data => {
            return {
                code: data.code
            };
        }));
    }
    getTestData() {
        var testData = {
            code: 'UT/SUP/01',
            name: 'Supplier 01',
            address: '7270 Colonial St. Hollis, NY 11423, USA',
            contact: 'Mrs. Smith',
            PIC: 'Mr. Smith',
            NPWP: 'N9TT-9G0A-B7FQ-RANC',
            serialNumber: 'US-XYRKCS'
        };
        return Promise.resolve(this.getSert(testData));
    }
}
module.exports = new SupplierDataUtil();
