'use strict'
var helper = require('../../helper');
var DeliveryOrderManager = require('../../../src/managers/purchasing/delivery-order-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var supplier = require('../master/supplier-data-util');
var poExternal = require('./purchase-order-external-data-util');

class PurchaseRequestDataUtil {
    getNew() {
        return new Promise((resolve, reject) => {
            helper
                .getManager(DeliveryOrderManager)
                .then(manager => {
                    Promise.all([supplier.getTestData(), poExternal.getNew()])
                        .then(results => {
                            var poEks=results[1];
                            var dataSupplier=results[0];
                            var poExt = poEks.items.map(poInternal => {
                                return poInternal.items.map(poItem => {
                                    return {
                                        purchaseOrderId: poInternal._id,
                                        purchaseOrder: poInternal,
                                        productId: poItem.product._id,
                                        product: poItem.product,
                                        purchaseOrderQuantity: 90,
                                        purchaseOrderUom: poItem.dealUom.uom,
                                        deliveredQuantity: 90,
                                        remark: ''
                                    }
                                })
                            });

                            poExt = [].concat.apply([], poExt);

                            var data = {
                                no: `UT/DO/${codeGenerator()}`,
                                refNo: '',
                                date: new Date(),
                                supplierDoDate: new Date(),
                                supplierId: dataSupplier._id,
                                supplier: dataSupplier,
                                isPosted: false,
                                remark: 'Unit Test Delivery Order',
                                items: [{
                                    purchaseOrderExternalId: poEks._id,
                                    purchaseOrderExternal: poEks,
                                    fulfillments: poExt 
                                }]
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

module.exports = new PurchaseRequestDataUtil();
