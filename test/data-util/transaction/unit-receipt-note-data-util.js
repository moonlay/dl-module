'use strict'
var helper = require('../../helper');
var UnitReceiptNoteManager = require('../../../src/managers/purchasing/unit-receipt-note-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var unit = require('../master/unit-data-util');
var supplier = require('../master/supplier-data-util');
var deliveryOrder = require('./delivery-order-data-util');

class UnitReceiptNoteDataUtil {
    getNew() {
        return new Promise((resolve, reject) => {
            helper
                .getManager(UnitReceiptNoteManager)
                .then(manager => {
                    Promise.all([unit.getTestData(), supplier.getTestData(), deliveryOrder.getNew()])
                        .then(results => {
                            var dataUnit=results[0];
                            var dataSupplier=results[1];
                            var dataDeliveryOrder=results[2];

                            var doItems = dataDeliveryOrder.items.map(doItem => { 
                                var item = doItem.fulfillments.map(fulfillment => {
                                    return fulfillment.purchaseOrder.items.map(poItem => {
                                        return {
                                            product: fulfillment.product,
                                            deliveredQuantity: fulfillment.deliveredQuantity,
                                            deliveredUom: fulfillment.purchaseOrderUom,
                                            purchaseOrderQuantity: fulfillment.purchaseOrderQuantity,
                                            pricePerDealUnit: poItem.pricePerDealUnit,
                                            currency: poItem.currency,
                                            currencyRate: poItem.currencyRate,
                                            purchaseOrderId: fulfillment.purchaseOrderId,
                                            purchaseOrder: fulfillment.purchaseOrder,
                                            remark: ''
                                        }
                                    })
                                }) 
                                item = [].concat.apply([], item);
                                return item;
                            });

                            doItems = [].concat.apply([], doItems);
                            var data = {
                                no: `UT/URN/${codeGenerator()}`,
                                unitId: dataUnit._id,
                                unit: dataUnit,
                                date: new Date(),
                                supplierId: dataSupplier._id,
                                supplier: dataSupplier,
                                deliveryOrderId: dataDeliveryOrder._id,
                                deliveryOrder: dataDeliveryOrder,
                                remark: 'Unit Test',
                                items: doItems
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

module.exports = new UnitReceiptNoteDataUtil();
