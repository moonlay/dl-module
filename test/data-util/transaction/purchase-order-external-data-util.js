'use strict'
var helper = require('../../helper');
var PoExternalManager = require('../../../src/managers/purchasing/purchase-order-external-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var supplier = require('../master/supplier-data-util');
var currency = require('../master/currency-data-util');
var vat = require('../master/vat-data-util');
var po = require('./purchase-order-data-util');

class PurchaseOrderExternalDataUtil {
    getNew(purchaseOrders) {
        return new Promise((resolve, reject) => {
            helper
                .getManager(PoExternalManager)
                .then(manager => {
                    var getPurchaseOrders = purchaseOrders ? purchaseOrders.map(purchaseOrder => Promise.resolve(purchaseOrder)) : [po.getNew(), po.getNew()];
                    Promise.all([supplier.getTestData(), currency.getTestData(), vat.getTestData()].concat(getPurchaseOrders))
                        .then(results => {
                            var supplier = results[0];
                            var currency = results[1];
                            var vat = results[2];
                            var po01 = results[3];
                            var po02 = results[4];

                            for (var po of[po01, po02]) {
                                for (var poItem of po.items) {
                                    poItem.currency = currency;
                                    poItem.currencyRate = currency.rate;
                                    poItem.dealQuantity = poItem.defaultQuantity;
                                    poItem.dealUom = poItem.defaultUom;
                                    poItem.pricePerDealUnit = poItem.product.price * 1.05;
                                }
                            }

                            var data = {
                                no: `UT/PO External/${codeGenerator()}`,
                                refNo: '',
                                supplierId: supplier._id,
                                supplier: supplier,
                                freightCostBy: 'Penjual',
                                currency: currency,
                                currencyRate: currency.rate,
                                paymentMethod: 'CASH',
                                paymentDueDays: 0,
                                vat: vat,
                                useVat: vat != undefined,
                                vatRate: vat.rate,
                                useIncomeTax: false,
                                date: new Date(),
                                expectedDeliveryDate: new Date(),
                                actualDeliveryDate: new Date(),
                                isPosted: false,
                                isClosed: false,
                                remark: '',
                                items: [po01, po02]
                            };
                            manager.create(data)
                                .then(id => {
                                    manager.getSingleById(id)
                                        .then(data => {
                                            resolve(data);
                                        })
                                        .catch(e => {
                                            reject(e);
                                        });
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
}

module.exports = new PurchaseOrderExternalDataUtil();
