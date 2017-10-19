'use strict'
var helper = require("../../../helper");
var FPReturManager = require("../../../../src/managers/inventory/finishing-printing/fp-retur-to-qc-doc-manager");
var PackingDataUtil = require('../../production/finishing-printing/packing-data-util');
var StorageDataUtil = require('../../master/storage-data-util');
var ProductDataUtil = require("../../master/product-data-util");
var InventoryDataUtil = require("../inventory-summary-data-util");
var codeGenerator = require('../../../../src/utils/code-generator');
var ConstructionDataUtil= require("../../master/material-construction-data-util");

var Models = require("dl-models");
var Map = Models.map;


class FPReturDataUtil {
    getNewData() {
        return Promise.all([PackingDataUtil.getNewTestData(), InventoryDataUtil.getNewTestData(), ConstructionDataUtil.getTestData() ])
            .then(result => {
                var packing = result[0];
                var inventory = result [1];
                var construction=result[2];

                var details=[{
                    productId:inventory.productId,
                    productName: "productTest",
                    designNumber: "test",
                    designCode: "01Test",
                    remark:"BCTest",
                    colorWay:"testColor",
                    quantityBefore:inventory.quantity,
                    returQuantity:10,
                    uomId:inventory.uomId,
                    uom:"test",
                    length:10,
                    weight:11,
                    storageId:inventory.storageId
                }];

                var Items=[{
                    productionOrderId:packing.productionOrderId,
                    productionOrderNo: packing.productionOrderNo,
                    packingId:packing._id,
                    details:details
                }];

                var data = {
                    returNo: codeGenerator(),
                    destination: "TEST",
                    deliveryOrderNo: "DOtest",
                    date: new Date(),
                    accepted: true,
                    remark: "test",
                    materialId:inventory.productId,
                    materialConstructionId:construction._id,
                    materialWidthFinish:"widthTest",
                    items: Items
                };

                return Promise.resolve(data);
            })
    }

    getNewTestData() {
        return helper
            .getManager(FPReturManager)
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
module.exports = new FPReturDataUtil();
