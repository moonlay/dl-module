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
        data.useIncomeTax = true;
        return Promise.resolve(data);
    }

    getRandomTestData() {
        return this.getNewData()
            .then((data) => {
                return this.getSert(data);
            });
    }

    getTestData() {
        var data = {
            code: 'UT/GRMNT/SUP/01',
            name: 'Supplier 01',
            address: '7270 Colonial St. Hollis, NY 11423, USA',
            contact: 'Mrs. Smith',
            PIC: 'Mr. Smith',
            NPWP: 'N9TT-9G0A-B7FQ-RANC',
            serialNumber: 'US-XYRKCS',
            import: true,
            useIncomeTax: false
        };
        return this.getSert(data);
    }

        getTestData2() {
        var data = {
            code: 'UT/GRMNT/SUP/02',
            name: 'Supplier 02',
            address: 'Jl. Slamet Riyadi No. 234, Solo, Indonesia',
            contact: 'Mr. Bambang',
            PIC: 'Mr. Bambang',
            NPWP: '452606862234000',
            serialNumber: 'ID-12528547',
            import: false,
            useIncomeTax: true,            
        };
        return this.getSert(data);
    }

        getTestData3() {
        var data = {
            code: 'UT/GRMNT/SUP/03',
            name: 'Supplier 03',
            address: 'Jl. Ahmad Yani No. 123, Semarang, Indonesia',
            contact: 'Mr. Adhy Pradana',
            PIC: 'Mr. Adhy Pradana',
            NPWP: '453306482238000',
            serialNumber: 'ID-21324786',
            import: false,
            useIncomeTax: false,            
        };
        return this.getSert(data);
    }
}
module.exports = new SupplierDataUtil();
