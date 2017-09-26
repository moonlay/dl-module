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

var InternNote = DLModels.garmentPurchasing.GarmentInternNote;
var InvoiceNoteManager = require('./invoice-note-manager');
var CurrencyManager = require('../master/currency-manager');
var SupplierManager = require('../master/garment-supplier-manager');
var PurchaseRequestManager = require('./purchase-request-manager');
var DeliveryOrderManager = require('./delivery-order-manager');

module.exports = class InternNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentInternNote);
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.invoiceNoteManager = new InvoiceNoteManager(db, user);
        this.currencyManager = new CurrencyManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
    }

    _validate(internNote) {
        var errors = {};
        var valid = internNote;
        var getInternNote = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            _deleted: false,
            no: valid.no || ""
        });

        var getInvoiceNotes = [];
        if (valid.items) {
            for (var item of valid.items) {
                if (ObjectId.isValid(item._id)) {
                    getInvoiceNotes.push(this.invoiceNoteManager.getSingleByIdOrDefault(item._id));
                }
            }
        } else {
            getInvoiceNotes.push(Promise.resolve(null));
        }
        var getCurrency = valid.currency && ObjectId.isValid(valid.currency._id) ? this.currencyManager.getSingleByIdOrDefault(valid.currency._id) : Promise.resolve(null);
        var getSupplier = valid.supplier && ObjectId.isValid(valid.supplier._id) ? this.supplierManager.getSingleByIdOrDefault(valid.supplier._id) : Promise.resolve(null);

        var listDueDate = [];
        var listPaymentMethod = [];
        var listPaymentType = [];
        if (valid.items) {
            for (var inv of valid.items) {
                for (var invItem of inv.items) {
                    for (var item of invItem.items) {
                        var _dueDate = new Date(invItem.deliveryOrderSupplierDoDate);
                        _dueDate.setDate(_dueDate.getDate() + item.paymentDueDays);
                        listDueDate.push(moment(_dueDate).format("DD MMM YYYY"));
                        listPaymentMethod.push(item.paymentMethod);
                        listPaymentType.push(item.paymentType);
                    }
                }
            }
        }

        listPaymentType = [].concat.apply([], listPaymentType);
        listPaymentType = listPaymentType.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })
        
        listPaymentMethod = [].concat.apply([], listPaymentMethod);
        listPaymentMethod = listPaymentMethod.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })

        listDueDate = [].concat.apply([], listDueDate);
        listDueDate = listDueDate.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })

        return Promise.all([getInternNote, getCurrency, getSupplier].concat(getInvoiceNotes))
            .then(results => {
                var _invoiceNote = results[0];
                var _currency = results[1];
                var _supplier = results[2];
                var _invoiceNotes = results.slice(3, results.length);
                var now = new Date();

                if (_invoiceNote) {
                    errors["no"] = i18n.__("InternNote.no.isExist:%s is exist", i18n.__("InternNote.no._:No"));
                }

                if (!valid.date || valid.date === "") {
                    errors["date"] = i18n.__("InternNote.date.isRequired:%s is required", i18n.__("InternNote.date._:Date"));
                    valid.date = '';
                }
                else if (new Date(valid.date) > now) {
                    errors["date"] = i18n.__("InternNote.date.isGreater:%s is greater than today", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                }
                else if (new Date(valid.date) > valid.dueDate) {
                    errors["date"] = i18n.__("InternNote.date.isGreaterDueDate:%s is greater than due date", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                }

                if (!valid.supplierId || valid.supplierId.toString() === "") {
                    errors["supplierId"] = i18n.__("InternNote.supplier.name.isRequired:%s is required", i18n.__("InternNote.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                }
                else if (valid.supplier) {
                    if (!valid.supplier._id) {
                        errors["supplierId"] = i18n.__("InternNote.supplier.name.isRequired:%s is required", i18n.__("InternNote.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                    }
                }
                else if (!_supplier) {
                    errors["supplierId"] = i18n.__("InternNote.supplier.name.isRequired:%s is required", i18n.__("InternNote.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                }

                if (!valid.currency) {
                    errors["currency"] = i18n.__("InternNote.currency.isRequired:%s is required", i18n.__("InternNote.currency._:Currency")); //"Currency tidak boleh kosong";
                }
                else if (valid.currency) {
                    if (!valid.currency._id) {
                        errors["currency"] = i18n.__("InternNote.currency.isRequired:%s is required", i18n.__("InternNote.currency._:Currency")); //"Currency tidak boleh kosong";
                    }
                }
                else if (!_currency) {
                    errors["currency"] = i18n.__("InternNote.currency.isRequired:%s is required", i18n.__("InternNote.currency._:Currency")); //"Currency tidak boleh kosong";
                }

                valid.items = valid.items || [];
                if (valid.items) {
                    if (valid.items.length <= 0) {
                        errors["items"] = [{ "InvoiceNoteId": i18n.__("InternNote.InvoiceNoteId.isRequired:%s is required", i18n.__("InternNote.InvoiceNoteId._:Invoice Note")) }]
                    } else {
                        var errItems = []

                        var itemUseIncomeTax = valid.items.map((validItem) => {
                            return validItem.useIncomeTax
                        })
                        itemUseIncomeTax = [].concat.apply([], itemUseIncomeTax);
                        itemUseIncomeTax = itemUseIncomeTax.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })

                        var itemUseVat = valid.items.map((validItem) => {
                            return validItem.useVat
                        })
                        itemUseVat = [].concat.apply([], itemUseVat);
                        itemUseVat = itemUseVat.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })

                        var itemVatType = valid.items.map((validItem) => {
                            if (validItem.vat) {
                                if (validItem.vat._id) {
                                    return validItem.vat._id.toString()
                                } else {
                                    return "";
                                }
                            } else {
                                return "";
                            }
                        })
                        itemVatType = [].concat.apply([], itemVatType);
                        itemVatType = itemVatType.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })

                        for (var item of valid.items) {
                            var errItem = {};
                            if (item._id) {
                                var _invoiceNote = _invoiceNotes.find(invoiceNote => invoiceNote._id.toString() === item._id.toString());
                                if (!_invoiceNote) {
                                    errItem = { "InvoiceNoteId": i18n.__("InternNote.InvoiceNoteId.isRequired:%s is required", i18n.__("InternNote.InvoiceNoteId._:Invoice Note")) }
                                } else if (itemUseIncomeTax.length > 1) {
                                    errItem = { "InvoiceNoteId": i18n.__("InternNote.InvoiceNoteId.differentIncomeTax:%s must same with all items (use or not)", i18n.__("InternNote.InvoiceNoteId._:Income Tax")) }
                                } else if (itemUseVat.length > 1) {
                                    errItem = { "InvoiceNoteId": i18n.__("InternNote.InvoiceNoteId.differentVat:%s must same with all items (use or not)", i18n.__("InternNote.InvoiceNoteId._:Vat")) }
                                } else {
                                    if (itemUseVat[0] && itemVatType.length > 1) {
                                        errItem = { "InvoiceNoteId": i18n.__("InternNote.InvoiceNoteId.differentVatType:%s must same with all items", i18n.__("InternNote.InvoiceNoteId._:Vat Type")) }
                                    }
                                    else if (listPaymentType.length > 1) {
                                        errItem = { "InvoiceNoteId": i18n.__("InternNote.InvoiceNoteId.differentDueDate:%s must same with all items", i18n.__("InternNote.InvoiceNoteId._:Payment Type")) }
                                    }
                                    else if (listPaymentMethod.length > 1) {
                                        errItem = { "InvoiceNoteId": i18n.__("InternNote.InvoiceNoteId.differentPaymentMethod:%s must same with all items", i18n.__("InternNote.InvoiceNoteId._:Payment Method")) }
                                    }
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
                    errors["items"] = [{ "InvoiceNoteId": i18n.__("InternNote.InvoiceNoteId.isRequired:%s is required", i18n.__("InternNote.InvoiceNoteId._:Invoice Note")) }]
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid.supplier = _supplier;
                valid.supplierId = valid.supplier._id;
                valid.currency = _currency;

                for (var item of valid.items) {
                    var _invoiceNote = _invoiceNotes.find(invoiceNote => invoiceNote._id.toString() === item._id.toString());
                    if (_invoiceNote) {
                        item = Object.assign(item, _invoiceNote)
                    }
                }

                if (!valid.stamp) {
                    valid = new InternNote(valid);
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
                "items.no": {
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

    _beforeInsert(internNote) {
        internNote.no = generateCode("internNote");
        return Promise.resolve(internNote);
    }

    _afterInsert(id) {
        return this.getSingleById(id, ["items._id"])
            .then((InternNote) => {
                var getInvoiceNotes = [];
                InternNote.items = InternNote.items || [];
                var invoiceNoteIds = InternNote.items.map((item) => { return item._id.toString() })
                invoiceNoteIds = invoiceNoteIds.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })
                for (var invoiceNoteId of invoiceNoteIds) {
                    if (ObjectId.isValid(invoiceNoteId)) {
                        getInvoiceNotes.push(this.invoiceNoteManager.getSingleByIdOrDefault(invoiceNoteId, ["_id", "hasInternNote"]));
                    }
                }
                return Promise.all(getInvoiceNotes)
                    .then((invoiceNotes) => {
                        var updateInvoiceNotePromise = [];
                        for (var invoiceNote of invoiceNotes) {
                            updateInvoiceNotePromise.push(this.invoiceNoteManager.collection.updateOne({
                                _id: invoiceNote._id
                            }, {
                                    $set: { "hasInternNote": true }
                                }))
                        }
                        return Promise.all(updateInvoiceNotePromise)
                    })
                    .then((result) => Promise.resolve(InternNote._id));
            })
    }

    _beforeUpdate(newInterNote) {
        return this.getSingleById(newInterNote._id)
            .then((oldInternNote) => {
                var getInvoiceNote = [];
                var oldItems = oldInternNote.items.map((item) => { return item._id.toString() })
                oldItems = oldItems.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var newItems = newInterNote.items.map((item) => { return item._id.toString() })
                newItems = newItems.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var updateInvoiceNotePromise = [];

                for (var oldItem of oldItems) {
                    var item = newItems.find(newItem => newItem.toString() === oldItem.toString())
                    if (!item) {
                        updateInvoiceNotePromise.push(this.invoiceNoteManager.getSingleByIdOrDefault(oldItem, ["_id", "hasInternNote"]).then((invoiceNote) => {
                            return this.invoiceNoteManager.collection.updateOne({ _id: invoiceNote._id }, { $set: { "hasInternNote": false } });
                        }));
                    }
                }

                for (var newItem of newItems) {
                    var item = oldItems.find(oldItem => newItem.toString() === oldItem.toString())
                    if (!item) {
                        updateInvoiceNotePromise.push(this.invoiceNoteManager.getSingleByIdOrDefault(oldItem, ["_id", "hasInternNote"]).then((invoiceNote) => {
                            return this.invoiceNoteManager.collection.updateOne({ _id: invoiceNote._id }, { $set: { "hasInternNote": true } });
                        }));
                    }
                }
                if (updateInvoiceNotePromise.length == 0) {
                    updateInvoiceNotePromise.push(Promise.resolve(null));
                }
                return Promise.all(updateInvoiceNotePromise)
                    .then((result) => {
                        return Promise.resolve(newInterNote);
                    })
            })

    }

    delete(InternNote) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this._validate(InternNote)
                    .then(validData => {
                        return this.collection
                            .updateOne({
                                _id: validData._id
                            }, {
                                $set: { "_deleted": true }
                            })
                            .then((result) => Promise.resolve(validData._id))
                            .then((InternNoteId) => {
                                var getInvoiceNotes = [];
                                InternNote.items = InternNote.items || [];
                                var invoiceNoteIds = InternNote.items.map((item) => { return item._id.toString() })
                                invoiceNoteIds = invoiceNoteIds.filter(function (elem, index, self) {
                                    return index == self.indexOf(elem);
                                })
                                for (var invoiceNote of invoiceNoteIds) {
                                    if (ObjectId.isValid(invoiceNote)) {
                                        getInvoiceNotes.push(this.invoiceNoteManager.getSingleByIdOrDefault(invoiceNote));
                                    }
                                }
                                return Promise.all(getInvoiceNotes)
                                    .then((invoiceNotes) => {
                                        var updateInvoiceNotePromise = [];
                                        for (var invoiceNote of invoiceNotes) {
                                            updateInvoiceNotePromise.push(this.invoiceNoteManager.collection.updateOne({
                                                _id: invoiceNote._id
                                            }, {
                                                    $set: { "hasInternNote": false }
                                                }))
                                        }
                                        return Promise.all(updateInvoiceNotePromise)
                                    })
                                    .then((result) => Promise.resolve(InternNote._id));
                            })
                    })
            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInternNote}_date`,
            key: {
                date: -1
            }
        };

        var noIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInternNote}_no`,
            key: {
                no: 1
            },
            unique: true
        };

        var createdDateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInternNote}__createdDate`,
            key: {
                _createdDate: -1
            }
        };

        return this.collection.createIndexes([dateIndex, noIndex, createdDateIndex]);
    }

    pdf(id, offset) {
        return new Promise((resolve, reject) => {
            this.getSingleById(id)
                .then(internNote => {
                    var listDOid = internNote.items.map(invoiceNote => {
                        var invoiceItem = invoiceNote.items.map(dataItem => {
                            return dataItem.deliveryOrderId.toString()
                        })
                        invoiceItem = [].concat.apply([], invoiceItem);
                        return invoiceItem;
                    });
                    listDOid = [].concat.apply([], listDOid);
                    listDOid = listDOid.filter(function (elem, index, self) {
                        return index == self.indexOf(elem);
                    })

                    var getListDO = [];
                    for (var doID of listDOid) {
                        if (ObjectId.isValid(doID)) {
                            getListDO.push(this.deliveryOrderManager.getSingleByIdOrDefault(doID, ["_id", "no", "items.fulfillments.purchaseOrderId", "items.fulfillments.purchaseRequestId", "items.fulfillments.product._id", "items.fulfillments.corrections"]));
                        }
                    }
                    Promise.all(getListDO)
                        .then((listDO) => {
                            var listCorretion = listDO.map(_do => {
                                var _listDO = _do.items.map(doItem => {
                                    var _items = doItem.fulfillments.map(fulfillment => {
                                        var correction = fulfillment.corrections ? fulfillment.corrections[fulfillment.corrections.length - 1] : {};
                                        return {
                                            doId: _do._id,
                                            doNo: _do.no,
                                            doPOid: fulfillment.purchaseOrderId,
                                            doPRid: fulfillment.purchaseRequestId,
                                            doProductid: fulfillment.product._id,
                                            doCorrection: correction || {},
                                        }
                                    });
                                    _items = [].concat.apply([], _items);
                                    return _items;
                                })
                                _listDO = [].concat.apply([], _listDO);
                                return _listDO;
                            });
                            listCorretion = [].concat.apply([], listCorretion);
                            listCorretion = listCorretion.filter(function (elem, index, self) {
                                return index == self.indexOf(elem);
                            })

                            var listPRid = internNote.items.map(invoiceNote => {
                                var invoiceItem = invoiceNote.items.map(dataItem => {
                                    var _items = dataItem.items.map(item => {
                                        return item.purchaseRequestId.toString()
                                    });
                                    _items = [].concat.apply([], _items);
                                    return _items;
                                })
                                invoiceItem = [].concat.apply([], invoiceItem);
                                return invoiceItem;
                            });
                            listPRid = [].concat.apply([], listPRid);
                            listPRid = listPRid.filter(function (elem, index, self) {
                                return index == self.indexOf(elem);
                            })

                            var getListPR = [];
                            for (var pr of listPRid) {
                                if (ObjectId.isValid(pr)) {
                                    getListPR.push(this.purchaseRequestManager.getSingleByIdOrDefault(pr, ["_id", "no", "unit"]));
                                }
                            }

                            Promise.all(getListPR)
                                .then((listPR) => {
                                    internNote.items.map(invoiceNote => {
                                        invoiceNote.items.map(dataItem => {
                                            dataItem.items.map(item => {
                                                var pr = listPR.find((PR) => PR._id.toString() === item.purchaseRequestId.toString())
                                                var correction = listCorretion.find((cItem) =>
                                                    cItem.doId.toString() == dataItem.deliveryOrderId.toString() &&
                                                    cItem.doNo == dataItem.deliveryOrderNo &&
                                                    cItem.doPRid.toString() == item.purchaseRequestId.toString() &&
                                                    cItem.doProductid.toString() == item.product._id.toString() &&
                                                    cItem.doPOid.toString() == item.purchaseOrderId.toString());
                                                if (correction) {
                                                    if (Object.getOwnPropertyNames(correction.doCorrection).length > 0) {
                                                        item.correction = correction.doCorrection.correctionPriceTotal - (item.pricePerDealUnit * item.deliveredQuantity)
                                                    } else {
                                                        item.correction = 0;
                                                    }
                                                } else {
                                                    item.correction = 0;
                                                }
                                                item.unit = pr.unit.code || "";
                                            });
                                        })
                                    });

                                    var getDefinition = require('../../pdf/definitions/garment-intern-note');
                                    var definition = getDefinition(internNote, offset);

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

    getDataMonitoring(info) {
        return new Promise((resolve, reject) => {
            var _defaultFilter = {
                _deleted: false
            };
            var userFilter = {};
            var internNoteFilter = {};
            var supplierFilter = {};
            var currencyFilter = {};
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
                internNoteFilter = { "no": info.no };
            }

            if (info.supplierId && info.supplierId != '') {
                supplierFilter = { "supplierId": new ObjectId(info.supplierId) };
            }

            if (info.currencyId && info.currencyId != '') {
                currencyFilter = { "currency._id": new ObjectId(info.currencyId) };
            }

            var filterDate = {
                "date": {
                    $gte: new Date(dateFrom),
                    $lte: new Date(dateTo)
                }
            };

            query = { '$and': [_defaultFilter, userFilter, internNoteFilter, supplierFilter, filterDate, currencyFilter] };

            return this.collection
                .aggregate([
                    { "$unwind": "$items" }
                    , { "$unwind": "$items.items" }
                    , { "$unwind": "$items.items.items" }
                    , { "$match": query }
                    , {
                        "$project": {
                            "_updatedDate": 1,
                            "no": "$no",
                            "date": "$date",
                            "supplier": "$supplier.name",
                            "currency": "$currency.code",
                            "paymentMethod": "$paymentMethod",
                            "paymentType": "$paymentType",
                            "dueDate": "$dueDate",
                            "invoiceNo": "$items.no",
                            "invoiceDate": "$items.date",
                            "productCode": "$items.items.items.product.code",
                            "productName": "$items.items.items.product.name",
                            "qty": "$items.items.items.deliveredQuantity",
                            "uom": "$items.items.items.purchaseOrderUom.unit",
                            "price": "$items.items.items.pricePerDealUnit"
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
            data["Nomor Nota Intern"] = _data.no ? _data.no : '';
            data["Tanggal Nota Intern"] = _data.date ? moment(new Date(_data.date)).add(query.offset, 'h').format(dateFormat) : '';
            data["Mata Uang"] = _data.currency;
            data["Supplier"] = _data.supplier;
            data["Term Pembayaran"] = _data.paymentMethod;
            data["Tipe Pembayaran"] = _data.paymentType;
            data["Tanggal Jatuh Tempo"] = _data.dueDate ? moment(new Date(_data.dueDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Nomor Invoice"] = _data.invoiceNo ? _data.invoiceNo : '';
            data["Tanggal Invoice"] = _data.invoiceDate ? moment(new Date(_data.invoiceDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Kode Barang"] = _data.productCode;
            data["Nama Barang"] = _data.productName;
            data["Jumlah"] = _data.qty;
            data["Satuan"] = _data.uom;
            data["Harga Satuan"] = _data.price;
            data["Harga Total"] = _data.price * _data.qty;

            xls.options["No"] = "number";
            xls.options["Nomor Nota Intern"] = "string";
            xls.options["Tanggal Nota Intern"] = "string";
            xls.options["Mata Uang"] = "string";
            xls.options["Supplier"] = "string";
            xls.options["Term Pembayaran"] = "string";
            xls.options["Tipe Pembayaran"] = "string";
            xls.options["Tanggal Jatuh Tempo"] = "string";
            xls.options["Nomor Invoice"] = "string";
            xls.options["Tanggal Invoice"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Jumlah"] = "number";
            xls.options["Satuan"] = "string";
            xls.options["Harga Satuan"] = "number";
            xls.options["Harga Total"] = "number";

            xls.data.push(data);
        }

        if (query.dateFrom && query.dateTo) {
            xls.name = `Nota Intern ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Nota Intern ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Nota Intern ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Nota Intern.xlsx`;

        return Promise.resolve(xls);
    }
}