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

                if (!valid.dueDate || valid.dueDate === "") {
                    errors["dueDate"] = i18n.__("InternNote.dueDate.isRequired:%s is required", i18n.__("InternNote.dueDate._:Date"));
                    valid.dueDate = '';
                }
                else if (new Date(valid.dueDate) < now) {
                    errors["dueDate"] = i18n.__("InternNote.dueDate.isLess:%s is less than today", i18n.__("DeliveryOrder.dueDate._:Due Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
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
                if (!valid.paymentMethod || valid.paymentMethod == '') {
                    errors["paymentMethod"] = i18n.__("InternNote.paymentMethod.isRequired:%s is required", i18n.__("InternNote.paymentMethod._:Payment Method"));
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

        return this.collection.createIndexes([dateIndex, noIndex]);
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
                                            doCorrection: fulfillment.correction || {},
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
                                                    cItem.doProductid.toString() == item.product.toString() &&
                                                    cItem.doPOid.toString() == item.purchaseOrderId.toString());

                                                item.correction = correction ? correction.doCorrection : {};
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
}