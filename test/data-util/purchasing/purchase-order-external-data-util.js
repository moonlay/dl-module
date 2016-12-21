'use strict';
var helper = require('../../helper');
var PoExternalManager = require('../../../src/managers/purchasing/purchase-order-external-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var supplier = require('../master/supplier-data-util');
var currency = require('../master/currency-data-util');
var vat = require('../master/vat-data-util');
var po = require('./purchase-order-data-util');

var get2NewPos = function() {
    return po.getNewTestData()
        .then((po1) => {
            return po.getNewTestData()
                .then((po2) => {
                    return Promise.resolve([po1, po2]);
                });
        });
};

class PurchaseOrderExternalDataUtil {
    getNewData(purchaseOrders) {
        return helper
            .getManager(PoExternalManager)
            .then(manager => {
                var getPurchaseOrders = purchaseOrders ? purchaseOrders : get2NewPos();
                return Promise.all([supplier.getTestData(), currency.getTestData(), vat.getTestData(), getPurchaseOrders])
                    .then(results => {
                        var supplier = results[0];
                        var currency = results[1];
                        var vat = results[2];
                        var pos = results[3];

                        for (var po of pos) {
                            for (var poItem of po.items) {
                                poItem.currency = currency;
                                poItem.currencyRate = currency.rate;
                                poItem.dealQuantity = poItem.defaultQuantity;
                                poItem.dealUom = poItem.defaultUom;
                                poItem.pricePerDealUnit = poItem.product.price * 1.05;
                                poItem.priceBeforeTax = poItem.pricePerDealUnit;
                            }
                        }
                        var no = `UT/PO External/${codeGenerator()}`;
                        var data = {
                            no: no,
                            refNo: no,
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
                            items: pos
                        };
                        return Promise.resolve(data);
                    });
            });
    }

    getNew(purchaseOrders) {
        return helper
            .getManager(PoExternalManager)
            .then(manager => {
                return this.getNewData(purchaseOrders).then((data) => {
                    return manager.create(data)
                        .then(id => {
                            return manager.getSingleById(id);
                        });
                });
            });
    }

    getPosted() {
        return this.getNew()
            .then(poe => {
                return helper
                    .getManager(PoExternalManager)
                    .then(manager => {
                        return manager.post([poe])
                            .then(ids => {
                                var id = ids[0];
                                return manager.getSingleById(id);
                            });
                    });
            });
    }
}

module.exports = new PurchaseOrderExternalDataUtil();
