require("should");
var helper = require("../../helper");

var invoiceNoteDataUtil = require("../../data-util/garment-purchasing/invoice-note-data-util");
var deliveryOrderDataUtil = require('../../data-util/garment-purchasing/delivery-order-data-util');
var ObjectId = require("mongodb").ObjectId;
var validate = require("dl-models").validator.garmentPurchasing.garmentInvoiceNote;
var InvoiceNoteManager = require("../../../src/managers/garment-purchasing/invoice-note-manager");
var invoiceNoteManager = null;
var invoiceNote = {};
var invoiceNoteItem = [];

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            invoiceNoteManager = new InvoiceNoteManager(db, {
                username: 'unit-test'
            });

            deliveryOrderDataUtil.getNewTestData()
                .then(results => {
                    var deliveryOrder = results;
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
                                deliveredQuantity: doFulfillment.deliveredQuantity,
                                pricePerDealUnit: doFulfillment.pricePerDealUnit
                            }
                        });
                        fulfillment = [].concat.apply([], fulfillment);
                        return fulfillment;
                    });
                    items = [].concat.apply([], items);
                    invoiceNoteItem = {
                        deliveryOrderId: deliveryOrder._id,
                        deliveryOrderNo: deliveryOrder.no,
                        deliveryOrderDate: deliveryOrder.date,
                        deliveryOrderSupplierDoDate: deliveryOrder.supplierDoDate,
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

it('#01. should success when create new invoice note with useIncomeTax = false and useVat = false ', function (done) {
    invoiceNoteDataUtil.getNewData()
        .then((data) => {
            data.useIncomeTax = false;
            data.incomeTaxDate = "";
            data.incomeTaxNo = "";
            data.useVat = false;
            data.vatDate = "";
            data.vatNo = "";
            data.vat = {};
            data.isPayTax = false;
            return invoiceNoteManager.create(data)
        })
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#02. should error when create new invoice note ', function (done) {
    invoiceNoteDataUtil.getNewData()
        .then((data) => {
            data.currency = {};
            data.useVat = true;
            data.vat = {};
            data.supprier = {}
            data.items = [];
            return invoiceNoteManager.create(data)
        })
        .then((id) => {
            done("Should not be able to create data");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});