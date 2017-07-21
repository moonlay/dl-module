'use strict'
var helper = require("../../../helper");

var ShipmentDocumentManager = require("../../../../src/managers/inventory/finishing-printing/fp-shipment-document-manager");

//Data Util
var ProductionOrderDataUtil = require("../../sales/production-order-data-util");
var BuyerDataUtil = require("../../master/buyer-data-util");
var StorageDataUtil = require('../../master/storage-data-util');
var ProductDataUtil = require("../../master/product-data-util");

var codeGenerator = require('../../../../src/utils/code-generator');

// DB Models
var Models = require("dl-models");
var Map = Models.map;
var FPShipmentDocumentModels = Models.inventory.finishingPrinting.FPShipmentDocument;


class FPShipmentDocumentDataUtil {
    getNewData() {
        return Promise.all([ProductionOrderDataUtil.getNewTestData(), BuyerDataUtil.getTestData(), StorageDataUtil.getPackingTestData(), ProductDataUtil.getTestData()])
            .then((results) => {
                var productionOrder1 = results[0];
                var buyer = results[1];
                var storage = results[2];
                var product1 = results[3];

                var data = {
                    code: codeGenerator(),
                    deliveryDate: new Date(),
                    deliveryNo: "UT/No-1",
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
                                    productId: product1._id,
                                    productCode: product1.code,
                                    productName: product1.name,
                                    designCode: productionOrder1.designCode,
                                    designNumber: productionOrder1.designNumber,
                                    colorType: productionOrder1.details[0].colorType.name,
                                    uomId: productionOrder1.uomId,
                                    uomUnit: productionOrder1.uom.unit,
                                    quantity: 1,
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
}
module.exports = new FPShipmentDocumentDataUtil();