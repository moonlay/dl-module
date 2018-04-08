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
var PurchaseOrderManager = require('./purchase-order-manager');
var DeliveryOrderManager = require('./delivery-order-manager');
var KursManager = require('./garment-currency-manager');
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;

module.exports = class InternNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentInternNote);
        this.kursManager = new KursManager(db, user);
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.invoiceNoteManager = new InvoiceNoteManager(db, user);
        this.currencyManager = new CurrencyManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
        this.unitReceiptNote = this.db.collection("garment-unit-receipt-notes");
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

                // if (!valid.date || valid.date === "") {
                //     errors["date"] = i18n.__("InternNote.date.isRequired:%s is required", i18n.__("InternNote.date._:Date"));
                //     valid.date = '';
                // }
                // else if (new Date(valid.date) > now) {
                //     errors["date"] = i18n.__("InternNote.date.isGreater:%s is greater than today", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                // }
                // else if (new Date(valid.date) > valid.dueDate) {
                //     errors["date"] = i18n.__("InternNote.date.isGreaterDueDate:%s is greater than due date", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                // }

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

                valid.hasUnitReceiptNote = true;

                var unitReceiptNotes = [];
                for (var item of valid.items) {
                    var _invoiceNote = _invoiceNotes.find(invoiceNote => invoiceNote._id.toString() === item._id.toString());
                    if (_invoiceNote) {
                        item = Object.assign(item, _invoiceNote)
                    }
                    //get data unit receipt notes
                    for (var unitReceiptNote of item.items) {
                        unitReceiptNotes.push(unitReceiptNote.deliveryOrderNo)
                    }
                }
                
                // set true or false "hasUnitReceiptNote" 
                return this.getUnitReceiptNote(unitReceiptNotes).then(res => {
                    for (var i of unitReceiptNotes) {
                        if (!(res.find(data => data.deliveryOrderNo == i))) {
                            valid.hasUnitReceiptNote = false;
                        }
                    }

                    if (!valid.stamp) {
                        valid = new InternNote(valid);
                    }

                    valid.stamp(this.user.username, 'manager');
                    return Promise.resolve(valid);
                })
            });
    }

    getUnitReceiptNote(data) {
        return new Promise((resolve, reject) => {
            this.unitReceiptNote.find({ "deliveryOrderNo": { $in: data }, "_deleted": false }).toArray(function (err, result) {
                resolve(result);
            });
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

    getRealization(internNote) {
        var realizations = internNote.items.map((invoiceNote) => {
            var internNoteItems = invoiceNote.items.map((invItem) => {
                return invItem.items.map((item) => {
                    return {
                        no: internNote.no,
                        date: internNote.date,
                        invoiceNoteId: invoiceNote._id,
                        deliveryOrderNo: invItem.deliveryOrderNo,
                        deliveryOrderId: invItem.deliveryOrderId,
                        deliveryOrderSupplierDoDate: invItem.deliveryOrderSupplierDoDate,
                        purchaseOrderId: item.purchaseOrderId,
                        productId: item.productId,
                        deliveredQuantity: item.deliveredQuantity,
                        pricePerDealUnit: item.pricePerDealUnit,
                        paymentDueDays: item.paymentDueDays
                    }
                })
            })
            internNoteItems = [].concat.apply([], internNoteItems);
            return internNoteItems
        })
        realizations = [].concat.apply([], realizations);
        return Promise.resolve(realizations);
    }

    _beforeInsert(internNote) {
        internNote.no = generateCode("internNote");
        internNote.date = new Date();
        return Promise.resolve(internNote);
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((internNote) => this.getRealization(internNote))
            .then((realizations) => this.updateInvoiceNote(realizations))
            .then((realizations) => this.updatePurchaseOrder(realizations))
            .then(() => {
                return Promise.resolve(id)
            })
    }

    _beforeUpdate(data) {
        return this.getSingleById(data._id)
            .then((internNote) => {
                return this.getRealization(internNote)
                    .then((realizations) => this.updateInvoiceNoteDeleteInterNote(realizations))
                    .then((realizations) => this.updatePurchaseOrderDeleteInterNote(realizations))
                    .then((realizations) => this.updateStatusNI(internNote))
            })
            .then(() => {
                return Promise.resolve(data)
            })
    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((internNote) => {
                return this.getRealization(internNote)
                    .then((realizations) => this.updateInvoiceNote(realizations))
                    .then((realizations) => this.updatePurchaseOrder(realizations))
                    .then((realizations) => this.updateStatusNI(internNote))
            })
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
                            .then((internNote) => this.getRealization(internNote))
                            .then((realizations) => this.updateInvoiceNoteDeleteInterNote(realizations))
                            .then((realizations) => this.updatePurchaseOrderDeleteInterNote(realizations))
                            .then(() => {
                                return Promise.resolve(data._id)
                            })
                    })
            });
    }

    updateInvoiceNote(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.invoiceNoteId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, invoiceNoteId) => {
            var job = this.invoiceNoteManager.getSingleById(invoiceNoteId)
                .then((invoiceNote) => {
                    return this.invoiceNoteManager.collection.updateOne({
                        _id: invoiceNote._id
                    }, {
                            $set: { "hasInternNote": true }
                        });
                })
            jobs.push(job);
        });
        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updateInvoiceNoteDeleteInterNote(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.invoiceNoteId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, invoiceNoteId) => {
            var job = this.invoiceNoteManager.getSingleById(invoiceNoteId)
                .then((invoiceNote) => {
                    return this.invoiceNoteManager.collection.updateOne({
                        _id: invoiceNote._id
                    }, {
                            $set: { "hasInternNote": false }
                        });
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
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    var realization = realizations.find(_realization => _realization.purchaseOrderId.toString() === purchaseOrder._id.toString())
                    var item = purchaseOrder.items.find(_item => _item.product._id.toString() === realization.productId.toString());
                    var fulfillment = item.fulfillments.find(_fulfillment => _fulfillment.deliveryOrderNo === realization.deliveryOrderNo);

                    var dueDate = new Date(realization.deliveryOrderSupplierDoDate);
                    dueDate.setDate(dueDate.getDate() + realization.paymentDueDays);
                    var internNote = {
                        interNoteNo: realization.no,
                        interNoteDate: realization.date,
                        interNotePrice: realization.pricePerDealUnit,
                        interNoteQuantity: realization.deliveredQuantity,
                        interNoteDueDate: dueDate
                    };
                    fulfillment = Object.assign(fulfillment, internNote);

                    var isFull = purchaseOrder.items
                        .map((item) => {
                            return item.fulfillments
                                .map((fulfillment) => fulfillment.hasOwnProperty("interNoteNo"))
                                .reduce((prev, curr, index) => {
                                    return prev && curr
                                }, true);
                        })
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);

                    var isRealized = purchaseOrder.items
                        .map((poItem) => poItem.realizationQuantity === poItem.dealQuantity)
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);

                    var totalReceived = purchaseOrder.items
                        .map(poItem => {
                            var total = poItem.fulfillments
                                .map(fulfillment => fulfillment.interNoteQuantity)
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);
                            return total;
                        })
                        .reduce((prev, curr, index) => {
                            return prev + curr;
                        }, 0);

                    var totalDealQuantity = purchaseOrder.items
                        .map(poItem => poItem.dealQuantity)
                        .reduce((prev, curr, index) => {
                            return prev + curr;
                        }, 0);

                    if (isFull && purchaseOrder.isClosed && isRealized && totalReceived === totalDealQuantity) {
                        purchaseOrder.status = poStatusEnum.COMPLETE;
                    } else if (isFull && purchaseOrder.isClosed && !isRealized && totalReceived !== totalDealQuantity) {
                        purchaseOrder.status = poStatusEnum.PREMATURE;
                    } else {
                        purchaseOrder.status = poStatusEnum.PAYMENT;
                    }

                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        });
        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrderDeleteInterNote(realizations) {
        var deliveryOrderIds = realizations.map((realization) => {
            return realization.deliveryOrderId
        })
        deliveryOrderIds = [].concat.apply([], deliveryOrderIds);
        deliveryOrderIds = deliveryOrderIds.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })

        var getDeliveryOrder = [];
        for (var deliveryOrderId of deliveryOrderIds) {
            getDeliveryOrder.push(this.deliveryOrderManager.getSingleByIdOrDefault(deliveryOrderId, ["no", "isClosed"]));
        }

        Promise.all(getDeliveryOrder)
            .then((deliveryOrders) => {
                var map = new Map();
                for (var realization of realizations) {
                    var key = realization.purchaseOrderId.toString();
                    if (!map.has(key))
                        map.set(key, [])
                    map.get(key).push(realization);
                }
                var jobs = [];
                map.forEach((realizations, purchaseOrderId) => {
                    var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                        .then((purchaseOrder) => {
                            var realization = realizations.find(_realization => _realization.purchaseOrderId.toString() === purchaseOrder._id.toString())
                            var deliveryOrder = deliveryOrders.find(_deliveryOrder => _deliveryOrder.no === realization.deliveryOrderNo)
                            var item = purchaseOrder.items.find(item => item.product._id.toString() === realization.productId.toString());
                            var fulfillment = item.fulfillments.find(fulfillment => fulfillment.deliveryOrderNo === realization.deliveryOrderNo);
                            delete fulfillment.interNoteNo;
                            delete fulfillment.interNoteDate;
                            delete fulfillment.interNotePrice;
                            delete fulfillment.interNoteQuantity;
                            delete fulfillment.interNoteDueDate;

                            var poStatus = purchaseOrder.items
                                .map((item) => {
                                    return item.fulfillments
                                        .map((fulfillment) => fulfillment.hasOwnProperty("interNoteNo"))
                                        .reduce((prev, curr, index) => {
                                            return prev || curr
                                        }, false);
                                })
                                .reduce((prev, curr, index) => {
                                    return prev || curr
                                }, false);
                            if (purchaseOrder.status.value <= 9) {
                                purchaseOrder.status = poStatus ? poStatusEnum.RECEIVING : (deliveryOrder.isClosed ? poStatusEnum.ARRIVED : poStatusEnum.ARRIVING);
                            }

                            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                        })
                    jobs.push(job);
                });
                return Promise.all(jobs).then((results) => {
                    return Promise.resolve(realizations);
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
                            getListDO.push(this.deliveryOrderManager.getSingleByIdOrDefault(doID, ["_id", "no", "supplierDoDate", "items.fulfillments.purchaseOrderId", "items.fulfillments.purchaseRequestId", "items.fulfillments.purchaseRequestRefNo", "items.fulfillments.product._id", "items.fulfillments.corrections", "items.fulfillments.currency"]));
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
                                            doPRRefno: fulfillment.purchaseRequestRefNo || "",
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

                            var listKurs = listDO.map(_do => {
                                return {
                                    doNo: _do.no,
                                    date: _do.supplierDoDate
                                }
                            });
                            listKurs = [].concat.apply([], listKurs);

                            var getListKurs = [];
                            for (var currency of listKurs) {
                                getListKurs.push(this.kursManager.collection.aggregate([
                                    {
                                        $match:
                                            { "_deleted": false, "code": internNote.currency.code, "date": { $lte: currency.date } }
                                    },
                                    {
                                        $project: {
                                            "code": 1, "rate": 1, "date": 1
                                        }
                                    },
                                    { $sort: { date: -1 } },
                                    { $limit: 1 }])
                                    .toArray())
                            }
                            Promise.all(getListKurs)
                                .then((result) => {
                                    result = [].concat.apply([], result);
                                    for (var data of result) {
                                        var kurs = listKurs.find(_kurs => _kurs.date >= data.date)
                                        if (kurs) {
                                            kurs = Object.assign(kurs, { rate: data.rate });
                                        }
                                    }
                                    listKurs = listKurs.sort(function (a, b) {
                                        return new Date(a.date) - new Date(b.date);
                                    });
                                    Promise.all(getListPR)
                                        .then((listPR) => {
                                            internNote.items.map(invoiceNote => {
                                                invoiceNote.items.map(dataItem => {
                                                    dataItem.items.map(item => {
                                                        var kurs = listKurs.find((_kurs) => _kurs.doNo === dataItem.deliveryOrderNo)
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

                                                            if (!item.purchaseRequestRefNo) {
                                                                item.purchaseRequestRefNo = correction.doPRRefno;
                                                            }
                                                        } else {
                                                            item.correction = 0;
                                                        }
                                                        item.kursRate = kurs.kurs || internNote.currency.rate
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
                    , { "$match": query },
                    {
                        "$project": {
                            "_updatedDate": 1,
                            "no": "$no",
                            "purchaseRequestRefNo": "$items.items.items.purchaseRequestRefNo",
                            "roNo": "$items.items.items.roNo",
                            "date": "$date",
                            "supplier": "$supplier.name",
                            "currency": "$currency.code",
                            "paymentMethod": "$items.items.items.paymentMethod",
                            "paymentType": "$items.items.items.paymentType",
                            "dueDate": { $add: ["$items.items.deliveryOrderDate", { $multiply: ["$items.items.items.paymentDueDays", 24, 60, 60000] }] },
                            "invoiceNo": "$items.no",
                            "invoiceDate": "$items.date",
                            "productCode": "$items.items.items.product.code",
                            "productName": "$items.items.items.product.name",
                            "qty": "$items.items.items.deliveredQuantity",
                            "uom": "$items.items.items.purchaseOrderUom.unit",
                            "price": "$items.items.items.pricePerDealUnit",

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
                    for (var data of results) {
                        for (var data1 of results) {
                            if (data.no === data1.no) {
                                if (data.dueDate < data1.dueDate) {
                                    data.dueDate = data1.dueDate;
                                }
                            }
                        }
                    }
                    resolve(results);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getDataMonitoringAll(info) {
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
                    , {
                        $lookup:
                            {
                                from: "garment-unit-receipt-notes",
                                localField: "items.items.deliveryOrderNo",
                                foreignField: "deliveryOrderNo",
                                as: "hasil_docs"
                            }
                    }
                    , { "$unwind": "$items.items.items" }
                    , { "$match": query }
                    , {
                        "$project": {
                            "_updatedDate": 1,
                            "no": "$no",
                            "purchaseRequestRefNo": "$items.items.items.purchaseRequestRefNo",
                            "roNo": "$items.items.items.roNo",
                            "date": "$date",
                            "supplier": "$supplier.name",
                            "currency": "$currency.code",
                            "paymentMethod": "$items.items.items.paymentMethod",
                            "paymentType": "$items.items.items.paymentType",
                            "dueDate": { $add: ["$items.items.deliveryOrderDate", { $multiply: ["$items.items.items.paymentDueDays", 24, 60, 60000] }] },
                            "invoiceNo": "$items.no",
                            "invoiceDate": "$items.date",
                            "deliveryOrderNo": "$items.items.deliveryOrderNo",
                            "deliveryOrderSupplierDoDate": "$items.items.deliveryOrderSupplierDoDate",
                            "unitReceiptNoteNo": "$hasil_docs.no",
                            "unitReceiptNoteDate": "$hasil_docs.date",
                            "productCode": "$items.items.items.product.code",
                            "productName": "$items.items.items.product.name",
                            "qty": "$items.items.items.deliveredQuantity",
                            "uom": "$items.items.items.purchaseOrderUom.unit",
                            "price": "$items.items.items.pricePerDealUnit",
                            "_createdBy": "$_createdBy"
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
                    for (var data of results) {
                        for (var data1 of results) {
                            if (data.no === data1.no) {
                                if (data.dueDate < data1.dueDate) {
                                    data.dueDate = data1.dueDate;
                                }
                            }
                        }
                    }
                    resolve(results);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getXlsDataMonitoringAll(result, query) {
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
            data["Nomor Surat Jalan"] = _data.deliveryOrderNo;
            data["Tanggal Surat Jalan"] = _data.deliveryOrderSupplierDoDate ? moment(new Date(_data.deliveryOrderSupplierDoDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Nomor Bon"] = _data.unitReceiptNoteNo;
            data["Tanggal Bon"] = _data.unitReceiptNoteDate ? moment(new Date(_data.unitReceiptNoteDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Kode Barang"] = _data.productCode;
            data["No Ref PR"] = _data.purchaseRequestRefNo;
            data["No RO"] = _data.roNo;
            data["Nama Barang"] = _data.productName;
            data["Jumlah"] = _data.qty;
            data["Satuan"] = _data.uom;
            data["Harga Satuan"] = _data.price;
            data["Harga Total"] = _data.price * _data.qty;
            data["User Input"] = _data._createdBy;

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
            xls.options["Nomor Surat Jalan"] = "string";
            xls.options["Tanggal Surat Jalan"] = "string";
            xls.options["Nomor Bon"] = "string";
            xls.options["Tanggal Bon"] = "string";
            xls.options["Nomor Ref PR"] = "string";
            xls.options["Nomor RO"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Jumlah"] = "number";
            xls.options["Satuan"] = "string";
            xls.options["Harga Satuan"] = "number";
            xls.options["Harga Total"] = "number";
            xls.options["User Input"] = "string";

            xls.data.push(data);
        }

        if (query.dateFrom && query.dateTo) {
            xls.name = `Nota Intern All ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Nota Intern All ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Nota Intern All ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Nota Intern All.xlsx`;

        return Promise.resolve(xls);
    }

    getAllData(startdate, enddate, offset) {
        return new Promise((resolve, reject) => {
            var now = new Date();
            var deleted = {
                _deleted: false
            };

            var validStartDate = new Date(startdate);
            var validEndDate = new Date(enddate);

            var query = [deleted];

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
      {$match: match },
      {$unwind:"$items"},
      {$unwind:"$items.items"},
      {$unwind:"$items.items.items"},
      {$project :{
                    "NoNI":"$no",
                    "TgNI":"$date",
                    "MtUang":"$currency.code",
                    "Rate" :"$currency.rate",
                    "KdSpl":"$supplier.code",
                    "NmSpl":"$supplier.name",   
                    "NoInv":"$items.no",
                    "TgInv":"$items.date",
                    "NoSJ" :"$items.items.deliveryOrderNo",
                    "TgSJ":"$items.items.deliveryOrderSupplierDoDate",
                    "TgDtg":"$items.items.deliveryOrderDate",
                    "PoExt":"$items.items.items.purchaseOrderExternalNo",
                    "PlanPO":"$items.items.items.purchaseRequestRefNo",
                    "NoRO":"$items.items.items.roNo",
                    "TipeByr":"$items.items.items.paymentType",
                    "TermByr":"$items.items.items.paymentMethod",
                    "Tempo":"$items.items.items.paymentDueDays",
                    "KdBrg":"$items.items.items.product.code",
                    "NmBrg":"$items.items.items.product.name",
                    "SatNI":"$items.items.items.purchaseOrderUom.unit",
                    "Qty" : "$items.items.items.deliveredQuantity",
                    "Harga" : "$items.items.items.pricePerDealUnit",
                    "TgIn":"$_createdDate",
                    "UserIn":"$_createdBy",
                    "TgEd":"$_updatedDate",
                    "UserEd":"$_updatedBy",
      }}, 
      {$group :{ _id: {"NoNI":"$NoNI","TgNI":"$TgNI","MtUang":"$MtUang","Rate":"$Rate","KdSpl":"$KdSpl","NmSpl":"$NmSpl",   
                       "NoInv":"$NoInv","TgInv":"$TgInv", "NoSJ" :"$NoSJ","TgSJ":"$TgSJ","TgDtg":"$TgDtg",
                       "PoExt":"$PoExt","PlanPO":"$PlanPO","NoRO":"$NoRO","TipeByr":"$TipeByr",
                       "TermByr":"$TermByr","Tempo":"$Tempo","KdBrg":"$KdBrg","NmBrg":"$NmBrg",
                       "SatNI":"$SatNI","Qty":"$Qty","Harga" : "$Harga","TgIn":"$TgIn","UserIn":"$UserIn",
                       "TgEd":"$TgEd","UserEd":"$UserEd"
               },
               "TotNI": { $sum: { $multiply: ["$Qty", "$Harga","$Rate"]
                                 }
                         }
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
            data["No Ref PR"] = _data.purchaseRequestRefNo;
            data["No RO"] = _data.roNo;
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
            xls.options["Nomor Ref PR"] = "string";
            xls.options["Nomor RO"] = "string";
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

    updateStatusNI(internNote) {
        var getDeliveryOrder = internNote.items.map((invoiceNote) => {
            var invoiceNotes = invoiceNote.items.map((invoiceItem) => {
                var listId = invoiceItem.items
                    .map(item => {
                        return this.deliveryOrderManager.getSingleByIdOrDefault(invoiceItem.deliveryOrderId)
                    })
                return listId;
            })
            invoiceNotes = [].concat.apply([], invoiceNotes);
            return invoiceNotes;
        })
        getDeliveryOrder = [].concat.apply([], getDeliveryOrder);
        return Promise.all(getDeliveryOrder)
            .then((deliveryOrders) => {
                var listStatus = [];
                for (var invoiceNote of internNote.items) {
                    for (var invoiceItem of invoiceNote.items) {
                        for (var item of invoiceItem.items) {
                            var _do = deliveryOrders.find((deliveryOrder) => deliveryOrder.no === invoiceItem.deliveryOrderNo);
                            var _doItem = _do.items.find((_item) => _item.purchaseOrderExternalNo === item.purchaseOrderExternalNo);
                            var _doFulfillment = _doItem.fulfillments.find((_fulfillment) => _fulfillment.product._id.toString() === item.product._id.toString() && _fulfillment.purchaseOrderNo === item.purchaseOrderNo)
                            listStatus.push(_doFulfillment ? (_doFulfillment.realizationQuantity.length > 0 ? true : false) : false);
                        }
                    }
                }
                internNote.hasUnitReceiptNote = listStatus.map((item) => item)
                    .reduce((prev, curr, index) => {
                        return prev && curr
                    }, true);

                if (!internNote.stamp) {
                    internNote = new InternNote(internNote);
                }

                internNote.stamp(this.user.username, 'manager');
                return this.collection.updateOne({
                    _id: internNote._id
                }, {
                        $set: internNote
                    })
            })
    }
}
