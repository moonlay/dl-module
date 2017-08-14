require("should");
var helper = require("../../helper");

var invoiceNoteDataUtil = require("../../data-util/garment-purchasing/invoice-note-data-util");
var deliveryOrderDataUtil = require('../../data-util/garment-purchasing/delivery-order-data-util');

var validate = require("dl-models").validator.garmentPurchasing.garmentInvoiceNote;
var InvoiceNoteManager = require("../../../src/managers/garment-purchasing/invoice-note-manager");
var invoiceNoteManager = null;
var invoiceNote = {};
var invoiceNoteItem = [];
var deliveryOrderId = {};

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            invoiceNoteManager = new InvoiceNoteManager(db, {
                username: 'unit-test'
            });


            deliveryOrderDataUtil.getNewTestData()
                .then(results => {
                    deliveryOrder = results;
                    deliveryOrderId = deliveryOrder._id;
                    var items = deliveryOrder.items.map(doItem => {
                        var fulfillment = doItem.fulfillments.map(doFulfillment => {
                            return {
                                purchaseOrderExternalId: doItem.purchaseOrderExternalId,
                                purchaseOrderExternalNo: doItem.purchaseOrderExternalNo,
                                purchaseOrderId: doFulfillment.purchaseOrderId,
                                purchaseOrderNo: doFulfillment.purchaseOrderNo,
                                purchaseRequestId: doFulfillment.purchaseRequestId,
                                purchaseRequestNo: doFulfillment.purchaseRequestNo,
                                productId: doFulfillment.productId,
                                product: doFulfillment.product,
                                purchaseOrderQuantity: doFulfillment.purchaseOrderQuantity,
                                purchaseOrderUom: doFulfillment.purchaseOrderUom,
                                deliveredQuantity: doFulfillment.deliveredQuantity
                            }
                        });
                        fulfillment = [].concat.apply([], fulfillment);
                        return fulfillment;
                    });
                    items = [].concat.apply([], items);
                    invoiceNoteItem = {
                        deliveryOrderId: deliveryOrder._id,
                        deliveryOrderNo: deliveryOrder.no,
                        items: items
                    }
                    done();
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should success when create new invoice note', function (done) {
    invoiceNoteDataUtil.getNewTestData()
        .then(data => {
            invoiceNote = data;
            validate(invoiceNote);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should success when update invoice note add new item', function (done) {
    invoiceNote.items.push(invoiceNoteItem);
    invoiceNoteManager.update(invoiceNote)
        .then((id) => {
            return invoiceNoteManager.getSingleById(id);
        })
        .then(invoiceNote => {
            var getDeliveryOrder = [];
            for (var item of invoiceNote.items) {
                if (ObjectId.isValid(item.deliveryOrderId)) {
                    getDeliveryOrder.push(this.invoiceNoteManager.deliveryOrderManager.getSingleByIdOrDefault(item.deliveryOrderId, ["hasInvoice"]));
                }
            }
            return Promise.all(getDeliveryOrder)
        })
        .then(deliveryOrders => {
            for (var deliveryOrder of deliveryOrders) {
                deliveryOrder.hasInvoice.should.be.Boolean();
                deliveryOrder.hasInvoice.should.equal(true);
            }
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#03. should success when update invoice note delete new item', function (done) {
    invoiceNote.items.splice(0, 1);
    invoiceNoteManager.update(invoiceNote)
        .then((id) => {
            return invoiceNoteManager.getSingleById(id);
        })
        .then(invoiceNote => {
            return this.invoiceNoteManager.deliveryOrderManager.getSingleByIdOrDefault(deliveryOrderId, ["hasInvoice"]);

        })
        .then(deliveryOrder => {
            deliveryOrder.hasInvoice.should.be.Boolean();
            deliveryOrder.hasInvoice.should.equal(false);
            done();
        })
        .catch(e => {
            done(e);
        });
});