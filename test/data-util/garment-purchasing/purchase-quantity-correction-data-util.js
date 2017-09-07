'use strict'
var helper = require('../../helper');
var PurchaseQuantityCorrectionManager = require('../../../src/managers/garment-purchasing/purchase-quantity-correction-manager');

var codeGenerator = require('../../../src/utils/code-generator');
var DeliveryOrderDataUtil = require("./delivery-order-data-util")

class PurchaseQuantityCorrectionDataUtil {
    getNewData() {
        var getPoe = poExternal.getPosted();

        return helper
            .getManager(PurchaseQuantityCorrectionManager)
            .then((manager) => {
                return Promise.all([DeliveryOrderDataUtil.getNewTestData()])
                    .then(results => {
                        var poEks = results[1];
                        var dataSupplier = results[0];
                        var poExt = poEks.items.map(poeItem => {
                            return {
                                purchaseOrderId: poeItem.poId,
                                purchaseOrderNo: poeItem.poNo,
                                purchaseRequestId: poeItem.prId,
                                purchaseRequestNo: poeItem.prNo,
                                productId: poeItem.productId,
                                product: poeItem.product,
                                purchaseOrderQuantity: poeItem.dealQuantity,
                                purchaseOrderUom: poeItem.dealUom,
                                deliveredQuantity: poeItem.dealQuantity - 1,
                                pricePerDealUnit: poeItem.pricePerDealUnit,
                                currency: poEks.currency,
                                realizationQuantity: [],
                                remark: ''
                            }
                        });

                        poExt = [].concat.apply([], poExt);

                        var data = {
                            no: `UT/DO/${codeGenerator()}`,
                            refNo: `REF/NO/UT/DO/${codeGenerator()}`,
                            date: new Date(),
                            supplierDoDate: new Date(),
                            supplierId: dataSupplier._id,
                            shipmentType: "By Air",
                            shipmentNo: `SHIPMENT/NO/UT/DO/${codeGenerator()}`,
                            supplier: dataSupplier,
                            isPosted: false,
                            useCustoms: true,
                            remark: 'Unit Test Delivery Order',
                            items: [{
                                purchaseOrderExternalId: poEks._id,
                                purchaseOrderExternalNo: poEks.no,
                                fulfillments: poExt
                            }]
                        };
                        return Promise.resolve(data);
                    });
            })
    }

    getNewDataPoExternalIsClosed() {
        var getPoe = poExternal.getClosed();

        return helper
            .getManager(DeliveryOrderManager)
            .then(manager => {
                return Promise.all([supplier.getTestData(), getPoe])
                    .then(results => {
                        var poEks = results[1];
                        var dataSupplier = results[0];
                        var poExt = poEks.items.map(poeItem => {
                            return {
                                purchaseOrderId: poeItem.poId,
                                purchaseOrderNo: poeItem.poNo,
                                purchaseRequestId: poeItem.prId,
                                purchaseRequestNo: poeItem.prNo,
                                productId: poeItem.productId,
                                product: poeItem.product,
                                purchaseOrderQuantity: poeItem.dealQuantity,
                                purchaseOrderUom: poeItem.dealUom,
                                deliveredQuantity: poeItem.dealQuantity - 1,
                                currency: poEks.currency,
                                realizationQuantity: [],
                                remark: ''
                            }
                        });

                        poExt = [].concat.apply([], poExt);

                        var data = {
                            no: `UT/DO/${codeGenerator()}`,
                            refNo: `REF/NO/UT/DO/${codeGenerator()}`,
                            date: new Date(),
                            supplierDoDate: new Date(),
                            supplierId: dataSupplier._id,
                            supplier: dataSupplier,
                            shipmentType: "By Air",
                            shipmentNo: `SHIPMENT/NO/UT/DO/${codeGenerator()}`,
                            isPosted: false,
                            remark: 'Unit Test Delivery Order',
                            items: [{
                                purchaseOrderExternalId: poEks._id,
                                purchaseOrderExternalNo: poEks.no,
                                fulfillments: poExt
                            }]
                        };
                        return Promise.resolve(data);
                    });
            })
    }

    getNewTestData() {
        return helper
            .getManager(DeliveryOrderManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }

    getNewTestDataPoExternalIsClosed() {
        return helper
            .getManager(DeliveryOrderManager)
            .then((manager) => {
                return this.getNewDataPoExternalIsClosed().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }

}

module.exports = new DeliveryOrderDataUtil();
