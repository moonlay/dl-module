'use strict'
var helper = require('../../helper');
var UnitReceiptNoteManager = require('../../../src/managers/garment-purchasing/unit-receipt-note-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var unit = require("../master/unit-data-util");
var supplier = require('../master/garment-supplier-data-util');
var deliveryOrder = require('../garment-purchasing/delivery-order-data-util');

class UnitReceiptNoteDataUtil {
    getNewData() {
        return helper
            .getManager(UnitReceiptNoteManager)
            .then(manager => {
                return Promise.all([unit.getTestData(), supplier.getTestData(), deliveryOrder.getNewTestData()])
                    .then(results => {
                        var dataUnit = results[0];
                        var dataSupplier = results[1];
                        var dataDeliveryOrder = results[2];

                        var poCollection = dataDeliveryOrder.items.map(doItem => {
                            var item = doItem.fulfillments.map(fulfillment => {
                                return fulfillment.purchaseOrderId
                            });
                            item = [].concat.apply([], item);
                            return item;
                        });
                        poCollection = [].concat.apply([], poCollection);
                        poCollection = poCollection.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })

                        var jobs = [];
                        for (var poId of poCollection) {
                            jobs.push(manager.purchaseOrderManager.getSingleByIdOrDefault(poId, ["_id", , "items.product", "items.category"]))
                        }

                        return Promise.all(jobs)
                            .then(listPoInternals => {

                                var doItems = dataDeliveryOrder.items.map(doItem => {
                                    var item = doItem.fulfillments.map(fulfillment => {
                                        var poInternal = listPoInternals.find((po) => po._id.toString() === fulfillment.purchaseOrderId.toString());
                                        var poItem = poInternal.items.find((item) => item.product._id.toString() === fulfillment.product._id.toString())
                                        return {
                                            product: fulfillment.product,
                                            deliveredQuantity: fulfillment.deliveredQuantity,
                                            deliveredUom: fulfillment.purchaseOrderUom,
                                            purchaseOrderQuantity: fulfillment.purchaseOrderQuantity,
                                            pricePerDealUnit: fulfillment.pricePerDealUnit,
                                            currency: fulfillment.currency,
                                            category: poItem.category,
                                            categoryId: poItem.category._id,
                                            purchaseOrderId: fulfillment.purchaseOrderId,
                                            purchaseOrder: fulfillment.purchaseOrder,
                                            purchaseRequestId: fulfillment.purchaseRequestId,
                                            purchaseRequestNo: fulfillment.purchaseRequestNo,
                                            remark: ''
                                        }
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
                                    deliveryOrderNo: dataDeliveryOrder.no,
                                    remark: 'Unit Test',
                                    isPaid: false,
                                    items: doItems
                                };
                                return Promise.resolve(data);
                            });
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
