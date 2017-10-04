"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class StorageDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/storage-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.Storage;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `name[${code}]`;
        data.description = `storage description [${code}]`;

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
            code: 'UT/STO/01',
            name: 'Storage Unit Test',
            description: ''
        };
        return this.getSert(data);
    }

    getPackingTestData() {
        var data = {
            code: 'UT/GudangJadi',
            name: 'Gudang Jadi Finishing Printing',
            description: ''
        };
        return this.getSert(data);
    }
}
module.exports = new StorageDataUtil();
