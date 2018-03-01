'use strict'
var helper = require('../../helper');
var UnitReceiptNoteManager = require('../../../src/managers/purchasing/unit-receipt-note-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var unit = require("../master/unit-data-util");
var supplier = require('../master/supplier-data-util');
var deliveryOrder = require('./delivery-order-data-util');
var storageDataUtil = require('../master/storage-data-util');

class UnitReceiptNoteDataUtil {
    getNewData() {
        return helper
            .getManager(UnitReceiptNoteManager)
            .then(manager => {
                return Promise.all([unit.getTestData(), supplier.getTestData(), deliveryOrder.getNewTestData(), storageDataUtil.getTextileInventoryTestData()])
                    .then(results => {
                        var dataUnit = results[0];
                        var dataSupplier = results[1];
                        var dataDeliveryOrder = results[2];
                        var storage = results[3];

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
                                });
                            });
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
                        return Promise.resolve(data);
                    });
            });
    }

     getNewTestData() {
        return helper
            .getManager(UnitReceiptNoteManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }

}

module.exports = new UnitReceiptNoteDataUtil();
