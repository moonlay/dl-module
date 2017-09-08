'use strict'
var helper = require('../../helper');
var PurchaseQuantityCorrectionManager = require('../../../src/managers/garment-purchasing/purchase-quantity-correction-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var deliveryOrder = require('./delivery-order-data-util');

class PurchaseQuantityCorrectionDataUtil {
    getNewData() {
        return helper
            .getManager(PurchaseQuantityCorrectionManager)
            .then((manager) => {
                return deliveryOrder.getNewTestData()
                    .then((result) => {
                        var dataDeliveryOrder = result;
                        var purchaseQuantityCorrectionItems = [];

                        for (var item of dataDeliveryOrder.items) {
                            for (var fulfillment of item.fulfillments) {
                                var obj = {
                                    purchaseOrderExternalId: item.purchaseOrderExternalId,
                                    purchaseOrderExternalNo: item.purchaseOrderExternalNo,
                                    purchaseOrderInternalId: fulfillment.purchaseOrderId,
                                    purchaseOrderInternalNo: fulfillment.purchaseOrderNo,
                                    purchaseOrderInternal: {},
                                    purchaseRequestId: fulfillment.purchaseRequestId,
                                    purchaseRequestNo: fulfillment.purchaseRequestNo,
                                    productId: fulfillment.productId,
                                    product: fulfillment.product,
                                    quantity: fulfillment.deliveredQuantity + 1,
                                    uomId: fulfillment.product.uomId,
                                    uom: fulfillment.purchaseOrderUom,
                                    pricePerUnit: fulfillment.pricePerDealUnit,
                                    priceTotal: fulfillment.pricePerDealUnit * (fulfillment.deliveredQuantity + 1),
                                    currency: fulfillment.product.currency,
                                    currencyRate: fulfillment.product.currency.rate
                                };

                                purchaseQuantityCorrectionItems.push(obj);
                            }
                        }
                        
                        var data = {
                            no: `UT/PPC/${codeGenerator()}`,
                            date: new Date(),
                            deliveryOrderId: dataDeliveryOrder._id,
                            deliveryOrder: dataDeliveryOrder,
                            correctionType: 'Jumlah',
                            remark: 'Unit Test Purchase Quantity Correction',
                            items: purchaseQuantityCorrectionItems
                        };
                        return Promise.resolve(data);
                    });
            });
    }

    getNewTestData() {
        return helper
            .getManager(PurchaseQuantityCorrectionManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}

module.exports = new PurchaseQuantityCorrectionDataUtil();