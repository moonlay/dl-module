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
            no: valid.no || "",
            _deleted: false
        });
        var getInvoiceNotePromise = this.collection.singleOrDefault({
            "$and": [{
                _id: {
                    '$ne': new ObjectId(valid._id)
                }
            }, {
                "refNo": valid.refNo
            }]
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

        var listPOExternals = [];
        if (valid.items) {
            listPOExternals = valid.items.map((niItem) => {
                return niItem.items.map((item) => {
                    return item.purchaseOrderExternalId
                })
            })
        }
        listPOExternals = [].concat.apply([], listPOExternals);
        listPOExternals = listPOExternals.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })
        var getPOExternalId = [];
        for (var poEksId of listPOExternals) {
            if (ObjectId.isValid(poEksId)) {
                getPOExternalId.push(this.deliveryOrderManager.purchaseOrderExternalManager.getSingleByIdOrDefault(poEksId, ["vat", "useVat", "useIncomeTax", "_id", "no"]));
            }
        }

        var getCurrency = valid.currency && ObjectId.isValid(valid.currency._id) ? this.currencyManager.getSingleByIdOrDefault(valid.currency._id) : Promise.resolve(null);
        var getSupplier = valid.supplier && ObjectId.isValid(valid.supplier._id) ? this.supplierManager.getSingleByIdOrDefault(valid.supplier._id) : Promise.resolve(null);
        var getVat = valid.vat && ObjectId.isValid(valid.vat._id) ? this.vatManager.getSingleByIdOrDefault(valid.vat._id) : Promise.resolve(null);

        return Promise.all(getPOExternalId)
            .then((listPOExternal) => {
                return Promise.all([getInvoiceNote, getCurrency, getSupplier, getVat, getInvoiceNotePromise].concat(getDeliveryOrder))
                    .then(results => {
                        var _invoiceNote = results[0];
                        var _currency = results[1];
                        var _supplier = results[2];
                        var _vat = results[3];
                        var _invoiceNoteByRefno = results[4];
                        var _deliveryOrders = results.slice(5, results.length);
                        var now = new Date();
                        // var useIncomeTax = listPOExternal
                        //     .map((poEks) => { return poEks.useIncomeTax })
                        //     .reduce((prev, curr, index) => {
                        //         return prev && curr
                        //     }, true);

                        var useIncomeTaxCount = 0;
                        for (var i of listPOExternal) {
                            if (valid.useIncomeTax == i.useIncomeTax) {
                                useIncomeTaxCount++
                            }
                        }
                        var useIncomeTax = listPOExternal.length == useIncomeTaxCount;

                        var useVatCount = 0;
                        var pphCount = 0;
                        for (var i of listPOExternal) {
                            if (valid.useVat == i.useVat) {
                                useVatCount++;
                            }
                            if (valid.useVat && i.vat) {
                                if (valid.vat.name + valid.vat.rate == i.vat.name + i.vat.rate) {
                                    pphCount++;
                                }
                            }
                        }
                        var useVat = listPOExternal.length == useVatCount;
                        var pphType = listPOExternal.length == pphCount;

                        // var useVat = listPOExternal
                        //     .map((poEks) => { return poEks.useVat })
                        //     .reduce((prev, curr, index) => {
                        //         return prev && curr
                        //     }, true);
                        _deliveryOrders = this.cleanUp(_deliveryOrders);
                        var currencies = [];
                        if (_deliveryOrders) {
                            currencies = _deliveryOrders.map((deliveryOrder) => {
                                var _deliveryOrder = deliveryOrder.items.map((doItem) => {
                                    var _doItem = doItem.fulfillments.map((fulfillment) => {
                                        return fulfillment.currency.code
                                    })
                                    _doItem = [].concat.apply([], _doItem);
                                    return _doItem;
                                })
                                _deliveryOrder = [].concat.apply([], _deliveryOrder);
                                return _deliveryOrder;
                            })
                            currencies = [].concat.apply([], currencies);
                            currencies = currencies.filter(function (elem, index, self) {
                                return index == self.indexOf(elem);
                            })
                        }

                        if (!valid.no || valid.no === "")
                            errors["no"] = i18n.__("InvoiceNote.no.isRequired:%s is required", i18n.__("InvoiceNote.no._:No"));
                        else if (_invoiceNote) {
                            errors["no"] = i18n.__("InvoiceNote.no.isExist:%s is exist", i18n.__("InvoiceNote.no._:No"));
                        }
                        if (_invoiceNoteByRefno) {
                            errors["refNo"] = i18n.__("InvoiceNote.refNo.isExist:%s is exist", i18n.__("InvoiceNote.refNo._:No"));
                        }

                        if (!valid.date || valid.date === "") {
                            errors["date"] = i18n.__("InvoiceNote.date.isRequired:%s is required", i18n.__("InvoiceNote.date._:Date"));
                            valid.date = '';
                        }
                        else if (new Date(valid.date) > now) {
                            errors["date"] = i18n.__("InvoiceNote.date.isGreater:%s is greater than today", i18n.__("InvoiceNote.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
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
                            else if (currencies.length > 1) {
                                errors["currency"] = i18n.__("InvoiceNote.currency.isRequired:%s cannot multiple type", i18n.__("InvoiceNote.currency._:Currency")); //"Currency tidak boleh kosong";
                            }
                            else if ((currencies[0] || "") !== valid.currency.code) {
                                errors["currency"] = i18n.__("InvoiceNote.currency.isRequired:%s cannot different type", i18n.__("InvoiceNote.currency._:Currency")); //"Currency tidak boleh kosong";
                            }
                        }
                        else if (!_currency) {
                            errors["currency"] = i18n.__("InvoiceNote.currency.isRequired:%s is required", i18n.__("InvoiceNote.currency._:Currency")); //"Currency tidak boleh kosong";
                        }

                        if (listPOExternal.length > 0) {
                            if (!useIncomeTax) {
                                errors["useIncomeTax"] = i18n.__("InvoiceNote.useIncomeTax.isRequired:%s is different with purchase order external", i18n.__("InvoiceNote.useIncomeTax._:Using PPn"));
                            }
                            else if (valid.useIncomeTax) {
                                if (!valid.incomeTaxNo || valid.incomeTaxNo == '') {
                                    errors["incomeTaxNo"] = i18n.__("InvoiceNote.incomeTaxNo.isRequired:%s is required", i18n.__("InvoiceNote.incomeTaxNo._:Nomor Faktur Pajak (PPn)"));
                                }

                                if (!valid.incomeTaxDate || valid.incomeTaxDate == '') {
                                    errors["incomeTaxDate"] = i18n.__("InvoiceNote.incomeTaxDate.isRequired:%s is required", i18n.__("InvoiceNote.incomeTaxDate._:Tanggal Faktur Pajak (PPn)"));
                                    valid.incomeTaxDate = "";
                                }
                            }
                            if (!useVat) {
                                errors["useVat"] = i18n.__("InvoiceNote.useVat.isRequired:%s is different with purchase order external", i18n.__("InvoiceNote.useVat._:Using PPh"));
                            }
                            else if (valid.useVat) {
                                if (!pphType) {
                                    errors["vat"] = i18n.__("InvoiceNote.vat.isRequired:%s is different with purchase order external", i18n.__("InvoiceNote.vat._:Using PPh Type"));
                                }
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
                            valid.vatDate = null
                        }

                        if (!valid.useIncomeTax) {
                            valid.incomeTaxDate = null;
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

                                    item.paymentMethod = deliveryOrderItem.paymentMethod;
                                    item.paymentType = deliveryOrderItem.paymentType;
                                    item.paymentDueDays = deliveryOrderItem.paymentDueDays;

                                    item.purchaseOrderId = deliveryOrderFulfillment.purchaseOrderId;
                                    item.purchaseOrderNo = deliveryOrderFulfillment.purchaseOrderNo;

                                    item.purchaseRequestId = deliveryOrderFulfillment.purchaseRequestId;
                                    item.purchaseRequestNo = deliveryOrderFulfillment.purchaseRequestNo;
                                    item.purchaseRequestRefNo = deliveryOrderFulfillment.purchaseRequestRefNo;
                                    item.roNo = deliveryOrderFulfillment.roNo;

                                    item.productId = deliveryOrderFulfillment.productId;
                                    item.product = deliveryOrderFulfillment.product;
                                    item.purchaseOrderUom = deliveryOrderFulfillment.purchaseOrderUom;
                                    item.purchaseOrderQuantity = Number(item.purchaseOrderQuantity);
                                    item.deliveredQuantity = Number(item.deliveredQuantity);
                                }
                            }
                        }

                        if (!valid.stamp) {
                            valid = new InvoiceNote(valid);
                        }

                        valid.stamp(this.user.username, 'manager');
                        return Promise.resolve(valid);
                    })
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
        invoiceNote.refNo = generateCode();
        if (invoiceNote.isPayTax && invoiceNote.useIncomeTax) {
            invoiceNote.incomeTaxInvoiceNo = generateCode("incomeTaxInvoiceNo");
        }
        if (invoiceNote.isPayTax && invoiceNote.useVat) {
            invoiceNote.vatInvoiceNo = generateCode("vatInvoiceNo");
        }
        invoiceNote.hasInternNote = false;
        return Promise.resolve(invoiceNote);
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((customs) => this.getRealization(customs))
            .then((realizations) => this.updateDeliveryOrder(realizations))
            .then((realizations) => this.updatePurchaseOrder(realizations))
            .then(() => {
                return Promise.resolve(id)
            })
    }

    _beforeUpdate(data) {
        return this.getSingleById(data._id)
            .then((customs) => this.getRealization(customs))
            .then((realizations) => this.updateDeliveryOrderDeleteInvoiceNote(realizations))
            .then((realizations) => this.updatePurchaseOrderDeleteInvoiceNote(realizations))
            .then(() => {
                return Promise.resolve(data)
            })
    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((customs) => this.getRealization(customs))
            .then((realizations) => this.updateDeliveryOrder(realizations))
            .then((realizations) => this.updatePurchaseOrder(realizations))
            .then(() => {
                return Promise.resolve(id)
            })
    }

    delete(data) {
        return this._pre(data)
            .then((validData) => {
                validData._deleted = true;
                return this.collection.update(validData)
                    .then((id) => {
                        var query = {
                            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
                        };
                        return this.getSingleByQuery(query)
                            .then((customs) => this.getRealization(customs))
                            .then((realizations) => this.updateDeliveryOrderDeleteInvoiceNote(realizations))
                            .then((realizations) => this.updatePurchaseOrderDeleteInvoiceNote(realizations))
                            .then(() => {
                                return Promise.resolve(data._id)
                            })
                    })
            });
    }

    getRealization(invoiceNote) {
        var realizations = invoiceNote.items.map((invItem) => {
            return invItem.items.map((item) => {
                return {
                    no: invoiceNote.no,
                    date: invoiceNote.date,
                    incomeTaxNo: invoiceNote.incomeTaxNo,
                    incomeTaxDate: invoiceNote.incomeTaxDate,
                    useIncomeTax: invoiceNote.useIncomeTax,
                    vatNo: invoiceNote.vatNo,
                    vatDate: invoiceNote.vatDate,
                    useVat: invoiceNote.useVat,
                    vat: invoiceNote.vat,
                    deliveryOrderNo: invItem.deliveryOrderNo,
                    deliveryOrderId: invItem.deliveryOrderId,
                    purchaseOrderId: item.purchaseOrderId,
                    productId: item.productId,
                }
            })
        })
        realizations = [].concat.apply([], realizations);
        return Promise.resolve(realizations);
    }

    updateDeliveryOrder(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.deliveryOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, deliveryOrderId) => {
            var job = this.deliveryOrderManager.getSingleById(deliveryOrderId)
                .then((deliveryOrder) => {
                    deliveryOrder.hasInvoice = true;
                    return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder);
                })
            jobs.push(job);
        });
        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updateDeliveryOrderDeleteInvoiceNote(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.deliveryOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, deliveryOrderId) => {
            var job = this.deliveryOrderManager.getSingleById(deliveryOrderId)
                .then((deliveryOrder) => {
                    deliveryOrder.hasInvoice = false;
                    return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder);
                })
            jobs.push(job);
        });
        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrder(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }
        var jobs = [];
        map.forEach((realizations, purchaseOrderId) => {
            var job = this.deliveryOrderManager.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    var realization = realizations.find(_realization => _realization.purchaseOrderId.toString() === purchaseOrder._id.toString())
                    var item = purchaseOrder.items.find(_item => _item.product._id.toString() === realization.productId.toString());
                    var fulfillment = item.fulfillments.find(_fulfillment => _fulfillment.deliveryOrderNo === realization.deliveryOrderNo);

                    var invoice = {
                        invoiceNo: realization.no,
                        invoiceDate: realization.date,
                        invoiceIncomeTaxNo: realization.incomeTaxNo,
                        invoiceIncomeTaxDate: realization.incomeTaxDate,
                        invoiceUseIncomeTax: realization.useIncomeTax,
                        invoiceVatNo: realization.vatNo,
                        invoiceVatDate: realization.vatDate,
                        invoiceUseVat: realization.useVat,
                        invoiceVat: realization.vat,
                    };
                    fulfillment = Object.assign(fulfillment, invoice);

                    return this.deliveryOrderManager.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        });
        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrderDeleteInvoiceNote(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }
        var jobs = [];
        map.forEach((realizations, purchaseOrderId) => {
            var job = this.deliveryOrderManager.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    var realization = realizations.find(_realization => _realization.purchaseOrderId.toString() === purchaseOrder._id.toString())
                    var item = purchaseOrder.items.find(item => item.product._id.toString() === realization.productId.toString());
                    var fulfillment = item.fulfillments.find(fulfillment => fulfillment.deliveryOrderNo === realization.deliveryOrderNo);
                    delete fulfillment.invoiceNo;
                    delete fulfillment.invoiceDate;
                    delete fulfillment.invoiceIncomeTaxNo;
                    delete fulfillment.invoiceIncomeTaxDate;
                    delete fulfillment.invoiceUseIncomeTax;
                    delete fulfillment.invoiceVatNo;
                    delete fulfillment.invoiceVatDate;
                    delete fulfillment.invoiceUseVat;
                    delete fulfillment.invoiceVat;
                    return this.deliveryOrderManager.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        });
        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInvoiceNote}_date`,
            key: {
                date: -1
            }
        };

        var refNoIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInvoiceNote}_refNo`,
            key: {
                refNo: 1
            },
            unique: true
        }

        var noIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInvoiceNote}_no`,
            key: {
                no: 1
            }
        };

        var createdDateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInvoiceNote}__createdDate`,
            key: {
                _createdDate: -1
            }
        };
        return this.collection.createIndexes([dateIndex, noIndex, createdDateIndex, refNoIndex]);
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

    getMonitoringInvoice(info) {
        return new Promise((resolve, reject) => {
            var _defaultFilter = {
                _deleted: false
            };
            var userFilter = {};
            var invoiceNumberFilter = {};
            var supplierFilter = {};
            var dateFromFilter = {};
            var dateToFilter = {};
            var query = {};

            var dateFrom = info.dateFrom ? (new Date(info.dateFrom).setHours((new Date(info.dateFrom)).getHours() - info.offset)) : (new Date(1900, 1, 1));
            var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59").setHours((new Date(info.dateTo + "T23:59")).getHours() - info.offset)) : (new Date());
            var now = new Date();

            if (info.user && info.user != '') {
                userFilter = { "_createdBy": info.user };
            }

            if (info.no && info.no != '') {
                invoiceNumberFilter = { "no": info.no };
            }

            if (info.supplierId && info.supplierId != '') {
                supplierFilter = { "supplierId": new ObjectId(info.supplierId) };
            }

            var filterDate = {
                "date": {
                    $gte: new Date(dateFrom),
                    $lte: new Date(dateTo)
                }
            };

            query = { '$and': [_defaultFilter, userFilter, invoiceNumberFilter, supplierFilter, filterDate] };

            return this.collection
                .aggregate([
                    { "$unwind": "$items" }
                    , { "$unwind": "$items.items" }
                    , { "$match": query }
                    , {
                        "$project": {
                            "_updatedDate": 1,
                            "no": "$no",
                            "date": "$date",
                            "supplier": "$supplier.name",
                            "currency": "$currency.code",
                            "tax": "$useIncomeTax",
                            "taxNo": "$incomeTaxNo",
                            "taxDate": "$incomeTaxDate",
                            "vat": "$useVat",
                            "vatName": "$vat.name",
                            "vatRate": "$vat.rate",
                            "vatNo": "$vatNo",
                            "vatDate": "$vatDate",
                            "payTax": "$isPayTax",
                            "doNo": "$items.deliveryOrderNo",
                            "poEksNo": "$items.items.purchaseOrderExternalNo",
                            "prNo": "$items.items.purchaseRequestNo",
                            "prRefNo": "$items.items.purchaseRequestRefNo",
                            "roNo": "$items.items.roNo",
                            "productCode": "$items.items.product.code",
                            "productName": "$items.items.product.name",
                            "qty": "$items.items.deliveredQuantity",
                            "uom": "$items.items.purchaseOrderUom.unit",
                            "price": "$items.items.pricePerDealUnit"
                        }
                    },
                    {
                        "$sort": {
                            "_updatedDate": -1
                        }
                    }
                ])
                .toArray()
                .then(results => {
                    resolve(results);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getAllData(startdate, enddate, offset) {
        return new Promise((resolve, reject) => {
            var now = new Date();
            var deleted = {
                _deleted: false
            };

            var query = [deleted];

            var validStartDate = new Date(startdate);
            var validEndDate = new Date(enddate);


            if (startdate && enddate) {
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
                var filterDate = {
                    "_createdDate": {
                        $gte: validStartDate,
                        $lte: validEndDate
                    }
                };
                query.push(filterDate);
            }
            else if (!startdate && enddate) {
                validEndDate.setHours(validEndDate.getHours() - offset);
                var filterDateTo = {
                    "_createdDate": {
                        $gte: now,
                        $lte: validEndDate
                    }
                };
                query.push(filterDateTo);
            }
            else if (startdate && !enddate) {
                validStartDate.setHours(validStartDate.getHours() - offset);
                var filterDateFrom = {
                    "_createdDate": {
                        $gte: validStartDate,
                        $lte: now
                    }
                };
                query.push(filterDateFrom);
            }
            var match = { '$and': query };

            this.collection.aggregate([
                { $match: match },
                { $unwind: "$items" },
                { $unwind: "$items.items" },
                {
                    $project: {
                        "NoInv": "$no",
                        "TgInv": "$date",
                        "KdSpl": "$supplier.code",
                        "NmSpl": "$supplier.name",
                        "MtUang": "$currency.code",
                        "Rate": "$currency.rate",
                        "PakaiPPN": "$useIncomeTax",
                        "NoPPN": "$incomeTaxNo",
                        "TgPPN": "$incomeTaxDate",
                        "PakaiPPH": "$useVat",
                        "NoPPH": "$vatNo",
                        "TgPPH": "$vatDate",
                        "NmPPH": "$vat.name",
                        "RatePPH": "$vat.rate",
                        "NoSJ": "$items.deliveryOrderNo",
                        "TgSJ": "$items.deliveryOrderSupplierDoDate",
                        "TgDtg": "$items.deliveryOrderDate",
                        "PoExt": "$items.items.purchaseOrderExternalNo",
                        "NoPR": "$items.items.purchaseRequestNo",
                        "PlanPO": "$items.items.purchaseRequestRefNo",
                        "NoRO": "$items.items.roNo",
                        "KdBrg": "$items.items.product.code",
                        "NmBrg": "$items.items.product.name",
                        "QtyInv": "$items.items.deliveredQuantity",
                        "HrgInv": "$items.items.pricePerDealUnit",
                        "SatInv": "$items.items.purchaseOrderUom.unit",
                        "UserIn": "$_createdBy",
                        "TgIn": "$_createdDate",
                        "UserEd": "$_updatedBy",
                        "TgEd": "$_updatedDate",
                        "BayarPajak": "$isPayTax",
                        "NoInvPPN":"$incomeTaxInvoiceNo",
                        "NoInvPPH": "$vatInvoiceNo"
                    }
                },
                {
                    $project: {
                        "NoInv": "$NoInv",
                        "TgInv": "$TgInv",
                        "KdSpl": "$KdSpl",
                        "NmSpl": "$NmSpl",
                        "MtUang": "$MtUang",
                        "Rate": "$Rate",
                        "PakaiPPN": "$PakaiPPN",
                        "NoPPN": "$NoPPN",
                        "TgPPN": "$TgPPN",
                        "PakaiPPH": "$PakaiPPH",
                        "NoPPH": "$NoPPH",
                        "TgPPH": "$TgPPH",
                        "NmPPH": "$NmPPH",
                        "RatePPH": "$RatePPH",
                        "NoSJ": "$NoSJ",
                        "TgSJ": "$TgSJ",
                        "TgDtg": "$TgDtg",
                        "PoExt": "$PoExt",
                        "NoPR": "$NoPR",
                        "PlanPO": "$PlanPO",
                        "NoRO": "$NoRO",
                        "KdBrg": "$KdBrg",
                        "NmBrg": "$NmBrg",
                        "QtyInv": "$QtyInv",
                        "HrgInv": "$HrgInv",
                        "SatInv": "$SatInv",
                        "UserIn": "$UserIn", "TgIn": "$TgIn",
                        "UserEd": "$UserEd", "TgEd": "$TgEd",
                        "BayarPajak": "$BayarPajak",
                        "NoInvPPN":"$NoInvPPN",
                        "NoInvPPH": "$NoInvPPH"                        
                    }
                },
                {
                    $group: {
                        _id: {
                            "NoInv": "$NoInv",
                            "TgInv": "$TgInv",
                            "KdSpl": "$KdSpl",
                            "NmSpl": "$NmSpl",
                            "MtUang": "$MtUang",
                            "Rate": "$Rate",
                            "PakaiPPN": "$PakaiPPN",
                            "NoPPN": "$NoPPN",
                            "TgPPN": "$TgPPN",
                            "PakaiPPH": "$PakaiPPH",
                            "NoPPH": "$NoPPH",
                            "TgPPH": "$TgPPH",
                            "NmPPH": "$NmPPH",
                            "RatePPH": "$RatePPH",
                            "NoSJ": "$NoSJ",
                            "TgSJ": "$TgSJ",
                            "TgDtg": "$TgDtg",
                            "PoExt": "$PoExt",
                            "NoPR": "$NoPR",
                            "PlanPO": "$PlanPO",
                            "NoRO": "$NoRO",
                            "KdBrg": "$KdBrg",
                            "NmBrg": "$NmBrg",
                            "QtyInv": "$QtyInv",
                            "HrgInv": "$HrgInv",
                            "SatInv": "$SatInv",
                            "UserIn": "$UserIn", "TgIn": "$TgIn",
                            "UserEd": "$UserEd", "TgEd": "$TgEd",
                            "BayarPajak":"$BayarPajak",
                            "NoInvPPN": "$NoInvPPN",
                            "NoInvPPH": "$NoInvPPH"                            
                        },
                        "TQtyInv": { $sum: "$QtyInv" },
                        "TotInv": { $sum: { $multiply: ["$QtyInv", "$HrgInv"] } }
                    }
                }
            ])
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    resolve(result);
                });
        });
    }

    getXls(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for (var _data of result.data) {
            var data = {};
            index += 1;
            data["No"] = index;
            data["No Invoice"] = _data.no ? _data.no : '';
            data["Tanggal Invoice"] = _data.date ? moment(new Date(_data.date)).add(query.offset, 'h').format(dateFormat) : '';
            data["Supplier"] = _data.supplier;
            data["Mata Uang"] = _data.currency;
            data["Dikenakan PPN"] = _data.tax ? 'Ya' : 'Tidak';
            data["Nomor PPN"] = _data.taxNo;
            data["Tanggal PPN"] = _data.taxDate ? moment(new Date(_data.taxDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Dikenakan PPH"] = _data.vat ? 'Ya' : 'Tidak';
            data["Jenis PPH"] = _data.vatName + ' ' + _data.vatRate;
            data["Nomor PPH"] = _data.vatNo;
            data["Tanggal PPH"] = _data.vatDate ? moment(new Date(_data.vatDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Pajak Dibayar"] = _data.payTax ? 'Ya' : 'Tidak';
            data["Nomor Surat Jalan"] = _data.doNo;
            data["Nomor PO Eksternal"] = _data.poEksNo;
            data["Nomor PR"] = _data.prNo;
            data["Nomor Ref PR"] = _data.prRefNo;
            data["Nomor RO"] = _data.roNo;
            data["Kode Barang"] = _data.productCode;
            data["Nama Barang"] = _data.productName;
            data["Jumlah"] = _data.qty;
            data["Satuan"] = _data.uom;
            data["Harga Satuan"] = _data.price;
            data["Harga Total"] = _data.price * _data.qty;

            xls.options["No"] = "number";
            xls.options["No Invoice"] = "string";
            xls.options["Tanggal Invoice"] = "string";
            xls.options["Supplier"] = "string";
            xls.options["Mata Uang"] = "string";
            xls.options["Dikenakan PPN"] = "string";
            xls.options["Nomor PPN"] = "string";
            xls.options["Tanggal PPN"] = "string";
            xls.options["Dikenakan PPH"] = "string";
            xls.options["Jenis PPH"] = "string";
            xls.options["Nomor PPH"] = "string";
            xls.options["Tanggal PPH"] = "string";
            xls.options["Pajak Dibayar"] = "string";
            xls.options["Nomor Surat Jalan"] = "string";
            xls.options["Nomor PO Eksternal"] = "string";
            xls.options["Nomor RO"] = "string";
            xls.options["Nomor PR"] = "string";
            xls.options["Nomor Ref PR"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Jumlah"] = "number";
            xls.options["Satuan"] = "string";
            xls.options["Harga Satuan"] = "number";
            xls.options["Harga Total"] = "number";

            xls.data.push(data);
        }

        if (query.dateFrom && query.dateTo) {
            xls.name = `Invoice ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Invoice ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Invoice ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Invoice.xlsx`;

        return Promise.resolve(xls);
    }

    cleanUp(input) {
        var newArr = [];
        for (var i = 0; i < input.length; i++) {
            if (input[i]) {
                newArr.push(input[i]);
            }
        }
        return newArr;
    }

};