"use strict";
var _getSert = require("../getsert");
var product = require("./product-data-util");
var machine = require("./machine-data-util");
var uom = require("./uom-data-util");
var generateCode = require("../../../src/utils/code-generator");

class LotMachineDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/lot-machine-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                productId: data.productId,
                machineId: data.machineId,
                lot: data.lot
            };
        });
    }

    getNewData() {
        return uom.getTestData()
                    .then(uom => {
                        return Promise.all([product.getRandomTestData(), machine.getTestData()])
                            .then((results) => {
                                var product = results[0];
                                var machine = results[1];

                                var code = generateCode();

                                var data = {
                                    productId: product._id,
                                    product: product,
                                    machineId: machine._id,
                                    machine: machine,
                                    rpm: 100,
                                    ne: 150,
                                    constant: 15,
                                    lot: `lot [${code}]`
                                };
                                return Promise.resolve(data);
                            });
        });
    }


    getTestData() {
        return uom.getTestData()
                    .then(uom => {
                        return Promise.all[product.getTestData(), machine.getTestData()]
                            .then((results) => {
                                var product = results[0];
                                var machine = results[1];

                                var data = {
                                    productId: product._id,
                                    product: product,
                                    machineId: machine._id,
                                    machine: machine,
                                    rpm: 100,
                                    ne: 150,
                                    constant: 15,
                                    lot: `UT-LOT`
                                };
                                return this.getSert(data);
                            });
        });
    }
}
module.exports = new LotMachineDataUtil();
