"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class SupplierDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/garment-supplier-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.Supplier;
        var data = new Model();

        var code = generateCode();
        data.code = code;
        data.name = `name[${code}]`;
        data.address = `Solo [${code}]`;
        data.contact = `phone[${code}]`;
        data.PIC = `PIC[${code}]`;
        data.import = true;
        data.NPWP = `NPWP[${code}]`;
        data.serialNumber = `serialNo[${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: 'UT/GRMNT/SUP/01',
            name: 'Supplier 01',
            address: '7270 Colonial St. Hollis, NY 11423, USA',
            contact: 'Mrs. Smith',
            PIC: 'Mr. Smith',
            NPWP: 'N9TT-9G0A-B7FQ-RANC',
            serialNumber: 'US-XYRKCS'
        };
        return this.getSert(data);
    }

    getTestData2() {
        var data = {
            code: 'UT/GRMNT/SUP/02',
            name: 'Supplier 02',
            address: '7270 Colonial 2St. Hollis, NY 11423, USA',
            contact: 'Mrs. Smi2th',
            PIC: 'Mr. Smit2h',
            NPWP: 'N9TT-9G0A2-B7FQ-RANC',
            serialNumber: 'US-XY2RKCS',
            import: true,
        };
        return this.getSert(data);
    }
}
module.exports = new SupplierDataUtil();
