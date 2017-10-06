'use strict';
var helper = require('../../helper');
var PoExternalManager = require('../../../src/managers/garment-purchasing/purchase-order-external-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var supplier = require('../master/garment-supplier-data-util');
var currency = require('../master/currency-data-util');
var category = require('../master/garment-category-data-util');
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
                return Promise.all([supplier.getTestData(), currency.getTestData(), vat.getTestData(), getPurchaseOrders])
                    .then(results => {
                        var supplier = results[0];
                        var currency = results[1];
                        var vat = results[2];
                        var pos = results[3];

                        var items = pos.map((purchaseOrder) => {
                            return purchaseOrder.items.map((item) => {
                                return {
                                    poNo: purchaseOrder.no,
                                    poId: purchaseOrder._id,
                                    prNo: purchaseOrder.purchaseRequest.no,
                                    prId: purchaseOrder.purchaseRequest._id,
                                    prRefNo: item.refNo,
                                    roNo: purchaseOrder.roNo,
                                    productId: item.productId,
                                    product: item.product,
                                    categoryId: item.categoryId,
                                    category: item.category,
                                    defaultQuantity: Number(item.defaultQuantity),
                                    defaultUom: item.defaultUom,
                                    dealQuantity: Number(item.defaultQuantity),
                                    dealUom: item.defaultUom,
                                    dealConversion: 1,
                                    quantityConversion: poeItem.dealQuantity * 1,
                                    uomConversion: item.category.uom || poeItem.dealUom,
                                    conversion: 1,
                                    budgetPrice: Number(item.budgetPrice),
                                    priceBeforeTax: Number(item.budgetPrice),
                                    pricePerDealUnit: Number(item.budgetPrice),
                                    useIncomeTax: false
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
                            paymentType: 'CASH',
                            paymentDueDays: 0,
                            vat: vat,
                            useVat: vat != undefined,
                            vatRate: vat.rate,
                            useIncomeTax: true,
                            category: "FABRIC",
                            date: new Date(),
                            expectedDeliveryDate: new Date(),
                            actualDeliveryDate: new Date(),
                            isPosted: false,
                            isClosed: false,
                            remark: '',
                            qualityStandard: {
                                shrinkage: '80%',
                                wetRubbing: '80%',
                                dryRubbing: '80%',
                                washing: '80%',
                                darkPerspiration: '80%',
                                lightMedPerspiration: '80%',
                                pieceLength: '60 yards up 20% 120 yards up to 80%',
                                qualityStandardType: 'AATCC'
                            },
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
