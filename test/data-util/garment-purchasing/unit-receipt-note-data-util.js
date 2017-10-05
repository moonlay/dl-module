'use strict'
var helper = require('../../helper');
var UnitReceiptNoteManager = require('../../../src/managers/garment-purchasing/unit-receipt-note-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var unit = require("../master/unit-data-util");
var supplier = require('../master/garment-supplier-data-util');
var deliveryOrder = require('../garment-purchasing/delivery-order-data-util');
var storageDataUtil = require('../master/storage-data-util');

class UnitReceiptNoteDataUtil {
    getNewData() {
        return helper
            .getManager(UnitReceiptNoteManager)
            .then(manager => {
                return Promise.all([unit.getTestData(), deliveryOrder.getNewTestData(),storageDataUtil.getGarmentInventTestData()])
                    .then(results => {
                        var dataUnit = results[0];
                        var dataDeliveryOrder = results[1];

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

                        var prCollection = dataDeliveryOrder.items.map(doItem => {
                            var item = doItem.fulfillments.map(fulfillment => {
                                return fulfillment.purchaseRequestId
                            });
                            item = [].concat.apply([], item);
                            return item;
                        });
                        prCollection = [].concat.apply([], prCollection);
                        prCollection = prCollection.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })

                        var getPRJobs = [];
                        for (var prId of prCollection) {
                            getPRJobs.push(manager.purchaseOrderManager.purchaseRequestManager.getSingleByIdOrDefault(prId, ["_id", , "buyer", "no"]))
                        }

                        return Promise.all(jobs)
                            .then(listPoInternals => {
                                return Promise.all(getPRJobs)
                                    .then(listPurchaseRequest => {
                                        var doItems = dataDeliveryOrder.items.map(doItem => {
                                            var item = doItem.fulfillments.map(fulfillment => {
                                                var purchaseRequest = listPurchaseRequest.find((pr) => pr._id.toString() === fulfillment.purchaseRequestId.toString());
                                                var poInternal = listPoInternals.find((po) => po._id.toString() === fulfillment.purchaseOrderId.toString());
                                                var poItem = poInternal.items.find((item) => item.product._id.toString() === fulfillment.product._id.toString())
                                                return {
                                                    product: fulfillment.product,
                                                    deliveredQuantity: fulfillment.deliveredQuantity,
                                                    deliveredUom: fulfillment.purchaseOrderUom,
                                                    purchaseOrderQuantity: fulfillment.purchaseOrderQuantity,
                                                    quantityConversion: fulfillment.quantityConversion,
                                                    uomConversion: fulfillment.uomConversion,
                                                    conversion: fulfillment.conversion,
                                                    pricePerDealUnit: fulfillment.pricePerDealUnit,
                                                    currency: fulfillment.currency,
                                                    category: poItem.category,
                                                    categoryId: poItem.category._id,
                                                    purchaseOrderId: fulfillment.purchaseOrderId,
                                                    purchaseOrderNo: fulfillment.purchaseOrderNo,
                                                    purchaseRequestId: fulfillment.purchaseRequestId,
                                                    purchaseRequestNo: fulfillment.purchaseRequestNo,
                                                    purchaseRequestRefNo: fulfillment.purchaseRequestRefNo,
                                                    buyer: purchaseRequest.buyer,
                                                    buyerId: purchaseRequest.buyer._id,
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
                                            supplierId: dataDeliveryOrder.supplier._id,
                                            supplier: dataDeliveryOrder.supplier,
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
            })
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
