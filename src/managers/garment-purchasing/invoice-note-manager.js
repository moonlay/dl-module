'use strict'

var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var generateCode = require('../../utils/code-generator');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var moment = require('moment');

var InvoiceNote = DLModels.garmentPurchasing.GarmentInvoiceNote;
var DeliveryOrderManager = require('./delivery-order-manager');
var CurrencyManager = require('../master/currency-manager');
var VatManager = require('../master/vat-manager');
var SupplierManager = require('../master/garment-supplier-manager');

module.exports = class InvoiceNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentInvoiceNote);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.currencyManager = new CurrencyManager(db, user);
        this.vatManager = new VatManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
    }

    _validate(invoiceNote) {
        var errors = {};
        var valid = invoiceNote;
        var getInvoiceNote = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            no: valid.no || ""
        });

        var getDeliveryOrder = [];
        if (valid.items) {
            for (var item of valid.items) {
                if (ObjectId.isValid(item.deliveryOrderId)) {
                    getDeliveryOrder.push(this.deliveryOrderManager.getSingleByIdOrDefault(item.deliveryOrderId));
                }
            }
        } else {
            getDeliveryOrder.push(Promise.resolve(null));
        }
        var getCurrency = valid.currency && ObjectId.isValid(valid.currency._id) ? this.currencyManager.getSingleByIdOrDefault(valid.currency._id) : Promise.resolve(null);
        var getSupplier = valid.supplier && ObjectId.isValid(valid.supplier._id) ? this.supplierManager.getSingleByIdOrDefault(valid.supplier._id) : Promise.resolve(null);
        var getVat = valid.vat && ObjectId.isValid(valid.vat._id) ? this.vatManager.getSingleByIdOrDefault(valid.vat._id) : Promise.resolve(null);

        return Promise.all([getInvoiceNote, getCurrency, getSupplier, getVat].concat(getDeliveryOrder))
            .then(results => {
                var _invoiceNote = results[0];
                var _currency = results[1];
                var _supplier = results[2];
                var _vat = results[3];
                var _deliveryOrders = results.slice(4, results.length);
                var now = new Date();

                if (_invoiceNote) {
                    errors["no"] = i18n.__("InvoiceNote.no.isExist:%s is exist", i18n.__("InvoiceNote.no._:No"));
                }

                if (!valid.date || valid.date === "") {
                    errors["date"] = i18n.__("InvoiceNote.date.isRequired:%s is required", i18n.__("InvoiceNote.date._:Date"));
                    valid.date = '';
                }
                else if (new Date(valid.date) > now) {
                    errors["date"] = i18n.__("InvoiceNote.date.isGreater:%s is greater than today", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                }

                if (!valid.supplierId || valid.supplierId.toString() === "") {
                    errors["supplierId"] = i18n.__("InvoiceNote.supplier.name.isRequired:%s is required", i18n.__("InvoiceNote.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                }
                else if (valid.supplier) {
                    if (!valid.supplier._id) {
                        errors["supplierId"] = i18n.__("InvoiceNote.supplier.name.isRequired:%s is required", i18n.__("InvoiceNote.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                    }
                }
                else if (!_supplier) {
                    errors["supplierId"] = i18n.__("InvoiceNote.supplier.name.isRequired:%s is required", i18n.__("InvoiceNote.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                }

                if (!valid.currency) {
                    errors["currency"] = i18n.__("InvoiceNote.currency.isRequired:%s is required", i18n.__("InvoiceNote.currency._:Currency")); //"Currency tidak boleh kosong";
                }
                else if (valid.currency) {
                    if (!valid.currency._id) {
                        errors["currency"] = i18n.__("InvoiceNote.currency.isRequired:%s is required", i18n.__("InvoiceNote.currency._:Currency")); //"Currency tidak boleh kosong";
                    }
                }
                else if (!_currency) {
                    errors["currency"] = i18n.__("InvoiceNote.currency.isRequired:%s is required", i18n.__("InvoiceNote.currency._:Currency")); //"Currency tidak boleh kosong";
                }

                if (valid.useIncomeTax) {
                    if (!valid.incomeTaxNo || valid.incomeTaxNo == '') {
                        errors["incomeTaxNo"] = i18n.__("InvoiceNote.incomeTaxNo.isRequired:%s is required", i18n.__("InvoiceNote.incomeTaxNo._:Nomor Faktur Pajak (PPn)"));
                    }

                    if (!valid.incomeTaxDate || valid.incomeTaxDate == '') {
                        errors["incomeTaxDate"] = i18n.__("InvoiceNote.incomeTaxDate.isRequired:%s is required", i18n.__("InvoiceNote.incomeTaxDate._:Tanggal Faktur Pajak (PPn)"));
                        valid.incomeTaxDate = "";
                    }
                }
                if (valid.useVat) {
                    if (valid.vat) {
                        if (!valid.vat._id) {
                            errors["vat"] = i18n.__("InvoiceNote.vat.isRequired:%s name is required", i18n.__("InvoiceNote.vat._:Jenis PPh"));
                        }
                    } else {
                        errors["vat"] = i18n.__("InvoiceNote.vat.isRequired:%s name is required", i18n.__("InvoiceNote.vat._:Jenis PPh"));
                    }

                    if (!valid.vatNo || valid.vatNo == '') {
                        errors["vatNo"] = i18n.__("InvoiceNote.vatNo.isRequired:%s is required", i18n.__("InvoiceNote.vatNo._:Nomor Faktur Pajak (PPh)"));
                    }

                    if (!valid.vatDate || valid.vatDate == '' || valid.vatDate === "undefined") {
                        errors["vatDate"] = i18n.__("InvoiceNote.vatDate.isRequired:%s is required", i18n.__("InvoiceNote.vatDate._:Tanggal Faktur Pajak (PPh)"));
                        valid.vatDate = "";
                    }
                }

                valid.items = valid.items || [];
                if (valid.items) {
                    if (valid.items.length <= 0) {
                        errors["items"] = [{ "deliveryOrderId": i18n.__("InvoiceNote.deliveryOrderId.isRequired:%s is required", i18n.__("InvoiceNote.deliveryOrderId._:Delivery Order")) }]
                    } else {
                        var errItems = []
                        for (var item of valid.items) {
                            if (item.deliveryOrderId) {
                                var errItem = {};
                                var _deliveryOrder = _deliveryOrders.find(deliveryOrder => deliveryOrder._id.toString() === item.deliveryOrderId.toString());
                                if (!_deliveryOrder) {
                                    errItem = { "deliveryOrderId": i18n.__("InvoiceNote.deliveryOrderId.isRequired:%s is required", i18n.__("InvoiceNote.deliveryOrderId._:Delivery Order")) }
                                }
                            } else if (!item.deliveryOrderId) {
                                errItem = { "deliveryOrderId": i18n.__("InvoiceNote.deliveryOrderId.isRequired:%s is required", i18n.__("InvoiceNote.deliveryOrderId._:Delivery Order")) }
                            } else {
                                errItem = {}
                            }
                            var fulfillmentErrors = [];
                            for (var fulfillmentItems of item.items || []) {
                                var fulfillmentError = {};

                                if (!fulfillmentItems.deliveredQuantity || fulfillmentItems.deliveredQuantity === 0) {
                                    fulfillmentError["deliveredQuantity"] = i18n.__("InvoiceNote.items.items.deliveredQuantity.isRequired:%s is required or not 0", i18n.__("InvoiceNote.items.items.deliveredQuantity._:DeliveredQuantity")); //"Jumlah barang diterima tidak boleh kosong";
                                }
                                fulfillmentErrors.push(fulfillmentError);
                            }
                            for (var fulfillmentError of fulfillmentErrors) {
                                if (Object.getOwnPropertyNames(fulfillmentError).length > 0) {
                                    errItem.items = fulfillmentErrors;
                                    break;
                                }
                            }
                            errItems.push(errItem);
                        }
                        for (var errItem of errItems) {
                            if (Object.getOwnPropertyNames(errItem).length > 0) {
                                errors.items = errItems;
                                break;
                            }
                        }
                    }
                }
                else {
                    errors["items"] = [{ "deliveryOrderId": i18n.__("InvoiceNote.deliveryOrderId.isRequired:%s is required", i18n.__("InvoiceNote.deliveryOrderId._:Delivery Order")) }]
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid.supplier = _supplier;
                valid.supplierId = valid.supplier._id;
                valid.currency = _currency;

                if (valid.useVat) {
                    valid.vat = _vat;
                } else {
                    valid.vatDate = "";
                }

                if (!valid.useIncomeTax) {
                    valid.incomeTaxDate = "";
                }

                if (valid.isPayTax && valid.useIncomeTax) {
                    valid.incomeTaxInvoiceNo = "";
                }
                if (valid.isPayTax && valid.useVat) {
                    valid.vatInvoiceNo = "";
                }

                for (var invoiceItem of valid.items) {
                    var validDo = _deliveryOrders.find(deliveryOrder => deliveryOrder._id.toString() === invoiceItem.deliveryOrderId.toString());
                    for (var item of invoiceItem.items) {
                        var deliveryOrderItem = validDo.items.find(doItem => doItem.purchaseOrderExternalId.toString() === item.purchaseOrderExternalId.toString());
                        var deliveryOrderFulfillment = deliveryOrderItem.fulfillments.find(doFulfillment => doFulfillment.purchaseOrderId.toString() === item.purchaseOrderId.toString());
                        if (deliveryOrderFulfillment) {
                            invoiceItem.deliveryOrderId = validDo._id;
                            invoiceItem.deliveryOrderNo = validDo.no;

                            item.purchaseOrderExternalId = deliveryOrderItem.purchaseOrderExternalId;
                            item.purchaseOrderExternalNo = deliveryOrderItem.purchaseOrderExternalNo;

                            item.purchaseOrderId = deliveryOrderFulfillment.purchaseOrderId;
                            item.purchaseOrderNo = deliveryOrderFulfillment.purchaseOrderNo;

                            item.purchaseRequestId = deliveryOrderFulfillment.purchaseRequestId;
                            item.purchaseRequestNo = deliveryOrderFulfillment.purchaseRequestNo;

                            item.productId = deliveryOrderFulfillment.productId;
                            item.product = deliveryOrderFulfillment.product;
                            item.purchaseOrderUom = deliveryOrderFulfillment.purchaseOrderUom;
                            item.purchaseOrderQuantity = Number(deliveryOrderFulfillment.purchaseOrderQuantity);
                            item.deliveredQuantity = Number(deliveryOrderFulfillment.deliveredQuantity);
                        }

                    }
                }

                if (!valid.stamp) {
                    valid = new InvoiceNote(valid);
                }

                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        },
            keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterNo = {
                'no': {
                    '$regex': regex
                }
            };

            var filterSupplier = {
                "supplier.name": {
                    "$regex": regex
                }
            };

            var filterItem = {
                "items.deliveryOrderNo": {
                    "$regex": regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplier, filterItem]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
    }

    _beforeInsert(invoiceNote) {
        if (invoiceNote.isPayTax && invoiceNote.useIncomeTax) {
            invoiceNote.incomeTaxInvoiceNo = generateCode("incomeTaxInvoiceNo");
        }
        if (invoiceNote.isPayTax && invoiceNote.useVat) {
            invoiceNote.vatInvoiceNo = generateCode("vatInvoiceNo");
        }
        return Promise.resolve(invoiceNote);
    }

    _afterInsert(id) {
        return this.getSingleById(id, ["items.deliveryOrderId"])
            .then((InvoiceNote) => {
                var getDeliveryOrder = [];
                InvoiceNote.items = InvoiceNote.items || [];
                var doIds = InvoiceNote.items.map((item) => { return item.deliveryOrderId })
                doIds = doIds.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })
                for (var doId of doIds) {
                    if (ObjectId.isValid(doId)) {
                        getDeliveryOrder.push(this.deliveryOrderManager.getSingleByIdOrDefault(doId));
                    }
                }
                return Promise.all(getDeliveryOrder)
                    .then((deliveryOrders) => {
                        var updateDeliveryOrderPromise = [];

                        for (var deliveryOrder of deliveryOrders) {
                            deliveryOrder.hasInvoice = true;
                            updateDeliveryOrderPromise.push(this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder))
                        }
                        return Promise.all(updateDeliveryOrderPromise)
                    })
                    .then((result) => Promise.resolve(InvoiceNote._id));
            })
    }

    _beforeUpdate(newInvoiceNote) {
        return this.getSingleById(newInvoiceNote._id)
            .then((oldInvoiceNote) => {
                var getDeliveryOrder = [];
                var oldItems = oldInvoiceNote.items.map((item) => { return item.deliveryOrderId })
                oldItems = oldItems.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var newItems = newInvoiceNote.items.map((item) => { return item.deliveryOrderId })
                newItems = newItems.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var updateDeliveryOrderPromise = [];

                for (var oldItem of oldItems) {
                    var item = newItems.find(newItem => newItem.toString() === oldItem.toString())
                    if (!item) {
                        updateDeliveryOrderPromise.push(this.deliveryOrderManager.getSingleByIdOrDefault(oldItem).then((deliveryOrder) => {
                            deliveryOrder.hasInvoice = false;
                            return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder)
                        }));
                    }
                }

                for (var newItem of newItems) {
                    var item = oldItems.find(oldItem => newItem.toString() === oldItem.toString())
                    if (!item) {
                        updateDeliveryOrderPromise.push(this.deliveryOrderManager.getSingleByIdOrDefault(newItem).then((deliveryOrder) => {
                            deliveryOrder.hasInvoice = true;
                            return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder)
                        }));
                    }
                }
                if (updateDeliveryOrderPromise.length == 0) {
                    updateDeliveryOrderPromise.push(Promise.resolve(null));
                }
                return Promise.all(updateDeliveryOrderPromise)
                    .then((result) => {
                        return Promise.resolve(newInvoiceNote);
                    })
            })

    }

    delete(invoiceNote) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this._validate(invoiceNote)
                    .then(validData => {
                        // validData._deleted = true;
                        return this.collection
                            .updateOne({
                                _id: validData._id
                            }, {
                                $set: { "_deleted": true }
                            })
                            .then((result) => Promise.resolve(validData._id))
                            .then((InvoiceNoteId) => {
                                var getDeliveryOrder = [];
                                invoiceNote.items = invoiceNote.items || [];
                                var doIds = invoiceNote.items.map((item) => { return item.deliveryOrderId })
                                doIds = doIds.filter(function (elem, index, self) {
                                    return index == self.indexOf(elem);
                                })
                                for (var doId of doIds) {
                                    if (ObjectId.isValid(doId)) {
                                        getDeliveryOrder.push(this.deliveryOrderManager.getSingleByIdOrDefault(doId));
                                    }
                                }
                                return Promise.all(getDeliveryOrder)
                                    .then((deliveryOrders) => {
                                        var updatedeliveryOrderPromise = [];

                                        for (var deliveryOrder of deliveryOrders) {
                                            deliveryOrder.hasInvoice = false;
                                            updatedeliveryOrderPromise.push(this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder))
                                        }
                                        return Promise.all(updatedeliveryOrderPromise)
                                    })
                                    .then((result) => Promise.resolve(invoiceNote._id));
                            })
                    })
            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.InvoiceNote}_date`,
            key: {
                date: -1
            }
        };

        var noIndex = {
            name: `ix_${map.purchasing.collection.InvoiceNote}_no`,
            key: {
                no: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    pdfVat(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleByIdOrDefault(id)
                .then(pox => {
                    var getDefinition = require('../../pdf/definitions/garment-invoice-vat-note');
                    var definition = getDefinition(pox, offset);

                    var generatePdf = require('../../pdf/pdf-generator');
                    generatePdf(definition)
                        .then(binary => {
                            resolve(binary);
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

    pdfIncomeTax(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleByIdOrDefault(id)
                .then(pox => {
                    var getDefinition = require('../../pdf/definitions/garment-invoice-income-tax-note');
                    var definition = getDefinition(pox, offset);

                    var generatePdf = require('../../pdf/pdf-generator');
                    generatePdf(definition)
                        .then(binary => {
                            resolve(binary);
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
};