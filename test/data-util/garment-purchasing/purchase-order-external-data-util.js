'use strict';
var helper = require('../../helper');
var PoExternalManager = require('../../../src/managers/garment-purchasing/purchase-order-external-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var supplier = require('../master/supplier-data-util');
var currency = require('../master/currency-data-util');
var category = require('../master/category-data-util');
var vat = require('../master/vat-data-util');
var po = require('./purchase-order-data-util');

var get2NewPos = function () {
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
                return Promise.all([supplier.getTestData(), currency.getTestData(), vat.getTestData(), category.getTestData(), getPurchaseOrders])
                    .then(results => {
                        var supplier = results[0];
                        var currency = results[1];
                        var vat = results[2];
                        var category = results[3]
                        var pos = results[4];

                        var items = pos.map((purchaseOrder) => {
                            return purchaseOrder.items.map((item) => {
                                if (item.categoryId.toString() === category._id.toString()) {
                                    return {
                                        poNo: purchaseOrder.no,
                                        poId: purchaseOrder._id,
                                        prNo: purchaseOrder.purchaseRequest.no,
                                        prId: purchaseOrder.purchaseRequest._id,
                                        prRefNo: item.refNo,
                                        roNo: purchaseOrder.roNo,
                                        productId: item.productId,
                                        product: item.product,
                                        defaultQuantity: Number(item.defaultQuantity),
                                        defaultUom: item.defaultUom,
                                        dealQuantity: Number(item.defaultQuantity),
                                        dealUom: item.defaultUom,
                                        budgetPrice: Number(item.budgetPrice),
                                        priceBeforeTax: Number(item.budgetPrice),
                                        pricePerDealUnit: Number(item.budgetPrice),
                                        conversion: 1,
                                        useIncomeTax: false
                                    }
                                }
                            })
                        })
                        items = [].concat.apply([], items);
                        var no = `UT/PO External/${codeGenerator()}`;
                        var data = {
                            no: no,
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
                            category:category,
                            categoryId:category._id,
                            date: new Date(),
                            expectedDeliveryDate: new Date(),
                            actualDeliveryDate: new Date(),
                            isPosted: false,
                            isClosed: false,
                            remark: '',
                            items: items
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

    getClosed() {
        return this.getNew()
            .then(poe => {
                return helper
                    .getManager(PoExternalManager)
                    .then(manager => {
                        poe.isClosed = true;
                        return manager.update(poe)
                            .then(id => {
                                return manager.getSingleById(id);
                            });
                    });
            });
    }
}

module.exports = new PurchaseOrderExternalDataUtil();
