"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");
var unit = require("./unit-data-util");

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
        return Promise.all([unit.getTestData()])
            .then((results) => {
                var _unit= results[0];
                var Model = require('dl-models').master.Storage;

                var code = generateCode();
                
                var data ={
                    code : code,
                    name : `name[${code}]`,
                    description : `storage description [${code}]`,
                    unit:_unit,
                    initId:_unit._id
                }

                return Promise.resolve(data);
            });
    }

    getRandomTestData() {
        return this.getNewData()
            .then((data) => {
                return this.getSert(data);
            });
    }

    getTestData() {
         return this.getNewData()
            .then((data) => {
                data.code = "PRD-UT-01";
                data.name = "Storage Unit Test 01";

                data.description = "Product untuk unit test";

                return this.getSert(data);
            });
    }

    getPackingTestData() {
        return this.getNewData()
            .then((data) => {
                data = {
                    code: 'UT/GudangJadi',
                    name: 'Gudang Jadi Finishing Printing',
                    description: ''
                };
                return this.getSert(data);
         });
    }

    getTextileInventoryTestData() {
        return this.getNewData()
            .then((data) => {
                var data = {
                    code: 'UT/GudangTextile01',
                    name: 'Gudang Pembelian Textile',
                    description: ''
                };
                return this.getSert(data);
            });
    }
}
module.exports = new StorageDataUtil();
