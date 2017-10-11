'use strict'
var helper = require('../../helper');
var PurchasePriceCorrection = require('../../../src/managers/garment-purchasing/purchase-price-correction-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var deliveryOrder = require('./delivery-order-data-util');

class PurchasePriceCorrectionDataUtil {
    getNewData() {
        return helper
            .getManager(PurchasePriceCorrection)
            .then(manager => {
                return deliveryOrder.getNewTestData()
                    .then(result => {
                        var dataDeliveryOrder = result;
                        var itemsPurchasePriceCorrection = [];

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
                                    roNo: fulfillment.roNo,
                                    productId: fulfillment.productId,
                                    product: fulfillment.product,
                                    quantity: fulfillment.deliveredQuantity,
                                    uomId: fulfillment.product.uomId,
                                    uom: fulfillment.purchaseOrderUom,
                                    pricePerUnit: fulfillment.pricePerDealUnit + 1000,
                                    priceTotal: fulfillment.pricePerDealUnit * fulfillment.deliveredQuantity,
                                    currency: fulfillment.product.currency,
                                    currencyRate: fulfillment.product.currency.rate
                                };

                                itemsPurchasePriceCorrection.push(obj);
                            }
                        }

                        var data = {
                            no: `UT/PPC/${codeGenerator()}`,
                            date: new Date(),
                            deliveryOrderId: dataDeliveryOrder._id,
                            deliveryOrder: dataDeliveryOrder,
                            correctionType: 'Harga Satuan',
                            remark: 'Unit Test Purchase Price Correction',
                            items: itemsPurchasePriceCorrection
                        };
                        return Promise.resolve(data);
                    });
            });
    }

    getNewTestData() {
        return helper
            .getManager(PurchasePriceCorrection)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}

module.exports = new PurchasePriceCorrectionDataUtil();