'use strict'
var helper = require('../../helper');
var DeliveryOrderManager = require('../../../src/managers/purchasing/delivery-order-manager');

var PoExternalManager = require('../../../src/managers/purchasing/purchase-order-external-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var supplier = require('../master/supplier-data-util');
var poExternal = require('../purchasing/purchase-order-external-data-util');

class DeliveryOrderDataUtil {
    getNewData() {
        var getPoe = poExternal.getPosted();

        return helper
            .getManager(DeliveryOrderManager)
            .then(manager => {
                return Promise.all([supplier.getTestData(), getPoe])
                    .then(results => {
                        var poEks = results[1];
                        var dataSupplier = results[0];
                        var poExt = poEks.items.map(poInternal => {
                            return poInternal.items.map(poItem => {
                                return {
                                    purchaseOrderId: poInternal._id,
                                    purchaseOrder: poInternal,
                                    productId: poItem.product._id,
                                    product: poItem.product,
                                    purchaseOrderQuantity: poItem.defaultQuantity,
                                    purchaseOrderUom: poItem.dealUom,
                                    deliveredQuantity: poItem.defaultQuantity - 1,
                                    remark: ''
                                }
                            })
                        });

                        poExt = [].concat.apply([], poExt);

                        var data = {
                            no: `UT/DO/${codeGenerator()}`,
                            refNo: `REF/NO/UT/DO/${codeGenerator()}`,
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
                        var poExt = poEks.items.map(poInternal => {
                            return poInternal.items.map(poItem => {
                                return {
                                    purchaseOrderId: poInternal._id,
                                    purchaseOrder: poInternal,
                                    productId: poItem.product._id,
                                    product: poItem.product,
                                    purchaseOrderQuantity: poItem.defaultQuantity,
                                    purchaseOrderUom: poItem.dealUom,
                                    deliveredQuantity: poItem.defaultQuantity - 1,
                                    remark: ''
                                }
                            })
                        });

                        poExt = [].concat.apply([], poExt);

                        var data = {
                            no: `UT/DO/${codeGenerator()}`,
                            refNo: `REF/NO/UT/DO/${codeGenerator()}`,
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
