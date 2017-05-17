'use strict'
var helper = require("../../../helper");
var PackingReceiptManager = require("../../../../src/managers/inventory/finishing-printing/fp-packing-receipt-manager");
var packingDataUtil = require('../../production/finishing-printing/packing-data-util');
var codeGenerator = require('../../../../src/utils/code-generator');

var Models = require("dl-models");
var Map = Models.map;
var PackingReceiptModel = Models.inventory.finishingPrinting.PackingReceipt;


class PackingReceiptDataUtil {
    getNewData() {
        return Promise.all([packingDataUtil.getNewTestData()])
            .then(result => {
                var packing = result[0];

                var data = {
                    code: codeGenerator(),
                    packingId: packing._id,
                    packingCode: packing.code,
                    date: new Date(),
                    accepted: true,
                    remark: "UT packing receipt",
                    items: [{
                        product: "product-test-1",
                        quantity: 6,
                        remark: "6 PCS @20 Meters",
                        notes: "6 PCS @20 Meters"
                    }, {
                        product: "product-test-2",
                        quantity: 4,
                        remark: "6 PCS @20 Meters",
                        notes: "6 PCS @20 Meters"
                    }]
                };

                return data;
            })
    }

    getNewTestData() {
        return helper
            .getManager(PackingReceiptManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }
}
module.exports = new PackingReceiptDataUtil();
