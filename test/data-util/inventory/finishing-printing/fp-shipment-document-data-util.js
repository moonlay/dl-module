'use strict'
var helper = require("../../../helper");

var ShipmentDocumentManager = require("../../../../src/managers/inventory/finishing-printing/fp-shipment-document-manager");

//Data Util
var ProductionOrderDataUtil = require("../../sales/production-order-data-util");
var BuyerDataUtil = require("../../master/buyer-data-util");
var InventoryDocumentDataUtil = require('../inventory-document-data-util');

var codeGenerator = require('../../../../src/utils/code-generator');

// DB Models
var Models = require("dl-models");
var Map = Models.map;
var FPShipmentDocumentModels = Models.inventory.finishingPrinting.FPShipmentDocument;


class FPShipmentDocumentDataUtil {
    getNewData() {
        return Promise.all([ProductionOrderDataUtil.getNewTestData(), BuyerDataUtil.getTestData(), InventoryDocumentDataUtil.getPackingNewTestData()])
            .then((results) => {
                var productionOrder1 = results[0];
                var buyer = results[1];
                var inventoryDocument = results[2];

                var data = {
                    code: codeGenerator(),
                    deliveryDate: new Date(),
                    shipmentNumber: "UT/No-1",
                    deliveryCode: "UT/No-1",
                    deliveryReference: "UT/Ref-01",

                    productIdentity: "UT/ID-1",

                    buyerId: buyer._id,
                    buyerCode: buyer.code,
                    buyerName: buyer.name,
                    buyerAddress: buyer.address,
                    buyerType: buyer.type,

                    details: [
                        {
                            productionOrderId: productionOrder1._id,
                            productionOrderNo: productionOrder1.orderNo,
                            productionOrderType: productionOrder1.orderType.name,
                            designCode: productionOrder1.designCode,
                            designNumber: productionOrder1.designNumber,
                            items: [
                                {
                                    productId: inventoryDocument.items[0].productId,
                                    productCode: inventoryDocument.items[0].productCode,
                                    productName: inventoryDocument.items[0].productName,
                                    designCode: productionOrder1.designCode,
                                    designNumber: productionOrder1.designNumber,
                                    colorType: productionOrder1.details[0].colorType.name,
                                    uomId: productionOrder1.uomId,
                                    uomUnit: productionOrder1.uom.unit,
                                    quantity: inventoryDocument.items[0].quantity,
                                    length: 1,
                                    weight: 1
                                }
                            ]
                        }
                    ],
                };

                return Promise.resolve(data);
            })
    }

    getNewTestData() {
        return helper
            .getManager(ShipmentDocumentManager)
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
module.exports = new FPShipmentDocumentDataUtil();