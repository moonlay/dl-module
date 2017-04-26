'use strict'
var helper = require("../../../helper");
var PackingManager = require("../../../../src/managers/production/finishing-printing/packing-manager");
var productionOrderDataUtil = require('../../sales/production-order-data-util');
var codeGenerator = require('../../../../src/utils/code-generator');

var Models = require("dl-models");
var Map = Models.map;
var PackingModel = Models.production.finishingPrinting.qualityControl.Packing;
var PackingItemModel = Models.production.finishingPrinting.qualityControl.PackingItem;

class PackingDataUtil {
    getNewData() {
        return Promise.all([productionOrderDataUtil.getNewTestData()])
            .then(result => {
                var productionOrder = result[0];


                var data = {
                    code: codeGenerator(),
                    pointSystem: 10,
                    productionOrderId: productionOrder._id,
                    productionOrderNo: productionOrder.orderNo,
                    date: new Date(),
                    buyer: productionOrder.buyer.name,
                    buyerLocation: productionOrder.buyer.type,
                    packingUom: "PCS",
                    colorCode: productionOrder.details[0].code,
                    items: [{
                        lot: "LOT01",
                        grade: "A",
                        weight: 0,
                        length: 120,
                        quantity: 6,
                        remark: "6 PCS @20 Meters"
                    }, {
                        lot: "LOT01",
                        grade: "B",
                        weight: 0,
                        length: 120,
                        quantity: 4,
                        remark: "4 PCS @30 Meters"
                    }]
                };

                return data;
            })
    }

        getNewDataItems() {
        return Promise.all([productionOrderDataUtil.getNewTestData()])
            .then(result => {
                var productionOrder = result[0];


                var data = {
                    code: codeGenerator(),
                    pointSystem: 10,
                    productionOrderId: productionOrder._id,
                    productionOrderNo: productionOrder.orderNo,
                    date: new Date(),
                    buyer: productionOrder.buyer.name,
                    buyerLocation: productionOrder.buyer.type,
                    packingUom: "PCS",
                    colorCode: productionOrder.details[0].code,
                    items: [{
                        lot: "a",
                        grade: "",
                        weight: 0,
                        length: 0,
                        quantity: 0,
                        remark: ""
                    }, {
                        lot: "a",
                        grade: "",
                        weight: 0,
                        length: 0,
                        quantity: 0,
                        remark: ""
                    }]
                };

                return data;
            })
    }

    getNewTestData() {
        return helper
            .getManager(PackingManager)
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
module.exports = new PackingDataUtil();
