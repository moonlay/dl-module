"use strict";
var _getSert = require("../getsert");
//var product = require("./product-data-util");
var yarn = require("./spinning-yarn-data-util");
var machine = require("./machine-data-util");
var unit = require("./unit-data-util");
var generateCode = require("../../../src/utils/code-generator");

class SpinningProductionLotDataUtil {
    getSert(input) {
        var manager = require("../../../src/managers/master/spinning-production-lot-manager");
        return _getSert(input, manager, (data) => {
            return {
                //productId: data.productId,
                spinningYarnId: data.spinningYarnId,
                machineId: data.machineId,
                unitId:data.unitId,
                lot: data.lot
            };
        });
    }

    getNewData() {
        return Promise.all([ machine.getTestData(),yarn.getTestData()])
            .then((results) => {
                //var _unit= results[0];
                var _machine=results[0];
                var _yarn=results[1];

                var code = generateCode();
                
                var data = {
                        // productId: product._id,
                        // product: product,
                        spinningYarnId: _yarn._id,
                        spinningYarn:_yarn,
                        machineId: _machine._id,
                        machine: _machine,
                        unit: _machine.unit,
                        unitId:_machine.unit._id,
                        rpm: 100,
                        ne: 150,
                        constant: 15,
                        lot: `lot [${code}]`
                    };

                return Promise.resolve(data);
            });
    }


    getTestData() {
         return Promise.all([ machine.getTestData(), yarn.getTestData()])
            .then((results) => {
                //var _unit= results[0];
                var _machine=results[0];
                var _yarn=results[1];
                
                var data = {
                    spinningYarnId: _yarn._id,
                    spinningYarn:_yarn,
                    machineId: _machine._id,
                    machine: _machine,
                    unit: _machine.unit,
                    unitId:_machine.unit._id,
                    rpm: 100,
                    ne: 150,
                    constant: 15,
                    lot: `UT-LOT`
                };
                return this.getSert(data);
            });
    }
        
}
module.exports = new SpinningProductionLotDataUtil();
