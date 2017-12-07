'use strict'
var helper = require("../../../helper");

var ShipmentDocumentManager = require("../../../../src/managers/inventory/finishing-printing/fp-shipment-document-manager");
var BuyerManager = require("../../../../src/managers/master/buyer-manager");
var ProductManager = require("../../../../src/managers/master/product-manager");
var ProductionOrderManager = require("../../../../src/managers/sales/production-order-manager");

//Data Util
var ProductionOrderDataUtil = require("../../sales/production-order-data-util");
var PackingReceiptDataUtil = require('./fp-packing-receipt-data-util');

var codeGenerator = require('../../../../src/utils/code-generator');

// DB Models
var Models = require("dl-models");
var Map = Models.map;
var FPShipmentDocumentModels = Models.inventory.finishingPrinting.FPShipmentDocument;


class FPShipmentDocumentDataUtil {
    getNewData() {
        return Promise.all([PackingReceiptDataUtil.getNewTestData()])
            .then((dataUtilResults) => {
                var packingReceipt = dataUtilResults[0];
                // var buyer = results[1];
                // var inventoryDocument = results[2];
                // var packingReceipt = results[3];
                var buyerName = packingReceipt.buyer;
                var getBuyer = this.getBuyer(buyerName, BuyerManager);

                var productionOrderNo = packingReceipt.productionOrderNo;
                var getProductionOrder = this.getProductionOrder(productionOrderNo, ProductionOrderManager);

                var productNames = packingReceipt.items.map((packingReceiptItem) => {
                    return packingReceiptItem.product;
                })
                var getProducts = this.getProducts(productNames, ProductManager);

                return Promise.all([getBuyer, getProductionOrder, getProducts])
                    .then((results) => {
                        var buyer = results[0];
                        var productionOrder = results[1];
                        var products = results[2];

                        var shipmentDocumentPackingReceiptItems = products.map((product) => {
                            var packingReceiptItem = packingReceipt.items.find((item) => item.product.toString() === product.name.toString());
                            return {
                                        productId: product._id,
                                        productCode: product.code,
                                        productName: product.name,
                                        designCode: product.properties.designCode,
                                        designNumber: product.properties.designNumber,
                                        colorType: product.properties.colorName,
                                        uomId: product.uomId,
                                        uomUnit: product.uom.unit,
                                        quantity: packingReceiptItem.quantity,
                                        length: packingReceiptItem.length,
                                        weight: packingReceiptItem.weight
                            }
                        })

                        var items = [{
                            packingReceiptId: packingReceipt._id,
                            packingReceipt: {
                                code: packingReceipt.code,
                                referenceNo: packingReceipt.referenceNo,
                                referenceType: packingReceipt.referenceType,
                                construction: packingReceipt.construction,
                            },
                            packingReceiptItems: shipmentDocumentPackingReceiptItems
                        }]

                        var details = [{
                            productionOrderId: productionOrder._id,
                            productionOrderNo: productionOrder.orderNo,
                            productionOrderType: productionOrder.orderType.name,
                            designCode: productionOrder.designCode,
                            designNumber: productionOrder.designNumber,
                            items: items
                        }]

                        var data = {
                            code: codeGenerator(),
                            deliveryDate: new Date(),
                            shipmentNumber: "UT/No-1",
                            deliveryCode: "UT/No-1",
                            deliveryReference: "UT/Ref-01",
                            productIdentity: "UT/ID-1",

                            storageId: packingReceipt.storageId,
                            storage: {
                                _id: packingReceipt.storageId,
                                code: packingReceipt.storage.code,
                                name: packingReceipt.storage.name
                            },

                            buyerId: buyer._id,
                            buyerCode: buyer.code,
                            buyerName: buyer.name,
                            buyerAddress: buyer.address,
                            buyerType: buyer.type,

                            details: details
                        }

                        return Promise.resolve(data);
                    })
            })
    }

    getWhiteOrderTypeData() {
        return Promise.all([PackingReceiptDataUtil.getNewWhiteOrderTypeData()])
            .then((dataUtilResults) => {
                var packingReceipt = dataUtilResults[0];
                // var buyer = results[1];
                // var inventoryDocument = results[2];
                // var packingReceipt = results[3];
                var buyerName = packingReceipt.buyer;
                var getBuyer = this.getBuyer(buyerName, BuyerManager);

                var productionOrderNo = packingReceipt.productionOrderNo;
                var getProductionOrder = this.getProductionOrder(productionOrderNo, ProductionOrderManager);

                var productNames = packingReceipt.items.map((packingReceiptItem) => {
                    return packingReceiptItem.product;
                })
                var getProducts = this.getProducts(productNames, ProductManager);

                return Promise.all([getBuyer, getProductionOrder, getProducts])
                    .then((results) => {
                        var buyer = results[0];
                        var productionOrder = results[1];
                        var products = results[2];

                        var shipmentDocumentPackingReceiptItems = products.map((product) => {
                            var packingReceiptItem = packingReceipt.items.find((item) => item.product.toString() === product.name.toString());
                            return {
                                        productId: product._id,
                                        productCode: product.code,
                                        productName: product.name,
                                        designCode: product.properties.designCode,
                                        designNumber: product.properties.designNumber,
                                        colorType: product.properties.colorName,
                                        uomId: product.uomId,
                                        uomUnit: product.uom.unit,
                                        quantity: packingReceiptItem.quantity,
                                        length: packingReceiptItem.length,
                                        weight: packingReceiptItem.weight
                            }
                        })

                        var items = [{
                            packingReceiptId: packingReceipt._id,
                            packingReceipt: {
                                code: packingReceipt.code,
                                referenceNo: packingReceipt.referenceNo,
                                referenceType: packingReceipt.referenceType,
                                construction: packingReceipt.construction,
                            },
                            packingReceiptItems: shipmentDocumentPackingReceiptItems
                        }]

                        var details = [{
                            productionOrderId: productionOrder._id,
                            productionOrderNo: productionOrder.orderNo,
                            productionOrderType: productionOrder.orderType.name,
                            designCode: productionOrder.designCode,
                            designNumber: productionOrder.designNumber,
                            items: items
                        }]

                        var data = {
                            code: codeGenerator(),
                            deliveryDate: new Date(),
                            shipmentNumber: "UT/No-1",
                            deliveryCode: "UT/No-1",
                            deliveryReference: "UT/Ref-01",
                            productIdentity: "UT/ID-1",

                            storageId: packingReceipt.storageId,
                            storage: {
                                _id: packingReceipt.storageId,
                                code: packingReceipt.storage.code,
                                name: packingReceipt.storage.name
                            },

                            buyerId: buyer._id,
                            buyerCode: buyer.code,
                            buyerName: buyer.name,
                            buyerAddress: buyer.address,
                            buyerType: buyer.type,

                            details: details
                        }

                        return Promise.resolve(data);
                    })
            })
    }

    getPrintingOrderTypeData() {
        return Promise.all([PackingReceiptDataUtil.getNewPrintingOrderTypeData()])
            .then((dataUtilResults) => {
                var packingReceipt = dataUtilResults[0];
                // var buyer = results[1];
                // var inventoryDocument = results[2];
                // var packingReceipt = results[3];
                var buyerName = packingReceipt.buyer;
                var getBuyer = this.getBuyer(buyerName, BuyerManager);

                var productionOrderNo = packingReceipt.productionOrderNo;
                var getProductionOrder = this.getProductionOrder(productionOrderNo, ProductionOrderManager);

                var productNames = packingReceipt.items.map((packingReceiptItem) => {
                    return packingReceiptItem.product;
                })
                var getProducts = this.getProducts(productNames, ProductManager);

                return Promise.all([getBuyer, getProductionOrder, getProducts])
                    .then((results) => {
                        var buyer = results[0];
                        var productionOrder = results[1];
                        var products = results[2];

                        var shipmentDocumentPackingReceiptItems = products.map((product) => {
                            var packingReceiptItem = packingReceipt.items.find((item) => item.product.toString() === product.name.toString());
                            return {
                                        productId: product._id,
                                        productCode: product.code,
                                        productName: product.name,
                                        designCode: product.properties.designCode,
                                        designNumber: product.properties.designNumber,
                                        colorType: product.properties.colorName,
                                        uomId: product.uomId,
                                        uomUnit: product.uom.unit,
                                        quantity: packingReceiptItem.quantity,
                                        length: packingReceiptItem.length,
                                        weight: packingReceiptItem.weight
                            }
                        })

                        var items = [{
                            packingReceiptId: packingReceipt._id,
                            packingReceipt: {
                                code: packingReceipt.code,
                                referenceNo: packingReceipt.referenceNo,
                                referenceType: packingReceipt.referenceType,
                                construction: packingReceipt.construction,
                            },
                            packingReceiptItems: shipmentDocumentPackingReceiptItems
                        }]

                        var details = [{
                            productionOrderId: productionOrder._id,
                            productionOrderNo: productionOrder.orderNo,
                            productionOrderType: productionOrder.orderType.name,
                            designCode: productionOrder.designCode,
                            designNumber: productionOrder.designNumber,
                            items: items
                        }]

                        var data = {
                            code: codeGenerator(),
                            deliveryDate: new Date(),
                            shipmentNumber: "UT/No-1",
                            deliveryCode: "UT/No-1",
                            deliveryReference: "UT/Ref-01",
                            productIdentity: "UT/ID-1",

                            storageId: packingReceipt.storageId,
                            storage: {
                                _id: packingReceipt.storageId,
                                code: packingReceipt.storage.code,
                                name: packingReceipt.storage.name
                            },

                            buyerId: buyer._id,
                            buyerCode: buyer.code,
                            buyerName: buyer.name,
                            buyerAddress: buyer.address,
                            buyerType: buyer.type,

                            details: details
                        }

                        return Promise.resolve(data);
                    })
            })
    }

    getBuyer(buyerName, manager) {
        return helper
            .getManager(manager)
            .then((instanceManager) => {
                var query = { "name": buyerName };
                return instanceManager.getSingleByQueryOrDefault(query)
            });
    }

    getProductionOrder(orderNo, manager) {
        return helper
            .getManager(manager)
            .then((instanceManager) => {
                var query = { "orderNo": orderNo };
                return instanceManager.getSingleByQueryOrDefault(query)
            })
    }

    getProducts(productNames, manager) {
        return helper
            .getManager(manager)
            .then((instanceManager) => {
                var query = { "name": { "$in": productNames } };
                return instanceManager.collection.find(query).toArray();
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

    getNewWhiteOrderTypeData() {
        return helper
            .getManager(ShipmentDocumentManager)
            .then((manager) => {
                return this.getWhiteOrderTypeData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }

    getNewPrintingOrderTypeData() {
        return helper
            .getManager(ShipmentDocumentManager)
            .then((manager) => {
                return this.getPrintingOrderTypeData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }
}
module.exports = new FPShipmentDocumentDataUtil();