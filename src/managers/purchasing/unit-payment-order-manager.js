'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var UnitPaymentOrder = DLModels.purchasing.UnitPaymentOrder;
var UnitReceiptNote = DLModels.purchasing.UnitReceiptNote;
var PurchaseOrderManager = require('./purchase-order-manager');
var UnitReceiptNoteManager = require('./unit-receipt-note-manager');
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;

module.exports = class UnitPaymentOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitPaymentOrder);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.unitReceiptNoteManager = new UnitReceiptNoteManager(db, user);
    }

    _validate(unitPaymentOrder) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = unitPaymentOrder || {};
            var getUnitReceiptNote = [];
            if (Object.getOwnPropertyNames(valid).length > 0) {
                for (var item of valid.items) {
                    getUnitReceiptNote.push(ObjectId.isValid(item.unitReceiptNoteId) ? this.unitReceiptNoteManager.getSingleByIdOrDefault(item.unitReceiptNoteId) : Promise.resolve(null));
                }
            }
            var getUnitPaymentOrderPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        "no": valid.no
                    }]
            });

            Promise.all([getUnitPaymentOrderPromise].concat(getUnitReceiptNote))
                .then(results => {
                    var _module = results[0];
                    var now = new Date();
                    var getURN = results.slice(1, results.length);

                    if (_module) {
                        errors["no"] = i18n.__("UnitPaymentOrder.no.isExist:%s is exist", i18n.__("UnitPaymentOrder.no._:No"));
                    }

                    if (!valid.divisionId) {
                        errors["division"] = i18n.__("UnitPaymentOrder.division.isRequired:%s is required", i18n.__("UnitPaymentOrder.division._:Divisi"));
                    }
                    else if (valid.division) {
                        if (!valid.division._id)
                            errors["division"] = i18n.__("UnitPaymentOrder.division.isRequired:%s is required", i18n.__("UnitPaymentOrder.division._:Divisi")); //"Unit tidak boleh kosong";
                    }
                    else if (!valid.division) {
                        errors["division"] = i18n.__("UnitPaymentOrder.division.isRequired:%s is required", i18n.__("UnitPaymentOrder.division._:Divisi")); //"Unit tidak boleh kosong";
                    }

                    if (!valid.date || valid.date == '') {
                        errors["date"] = i18n.__("UnitPaymentOrder.date.isRequired:%s is required", i18n.__("UnitPaymentOrder.date._:Date")); //tanggal surat perintah bayar tidak boleh kosong";
                    }

                    if (!valid.invoceNo || valid.invoceNo == '') {
                        errors["invoceNo"] = i18n.__("UnitPaymentOrder.invoceNo.isRequired:%s is required", i18n.__("UnitPaymentOrder.invoceNo._:InvoceNo")); //No. surat invoice tidak boleh kosong";
                    }
                    if (!valid.invoceDate || valid.invoceDate == '') {
                        errors["invoceDate"] = i18n.__("UnitPaymentOrder.invoceDate.isRequired:%s is required", i18n.__("UnitPaymentOrder.invoceDate._:InvoceDate")); //tanggal surat invoice tidak boleh kosong";
                    }
                    if (!valid.supplierId) {
                        errors["supplier"] = i18n.__("UnitPaymentOrder.supplier.isRequired:%s name is required", i18n.__("UnitPaymentOrder.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    }
                    else if (valid.supplier) {
                        if (!valid.supplier._id)
                            errors["supplier"] = i18n.__("UnitPaymentOrder.supplier.isRequired:%s name is required", i18n.__("UnitPaymentOrder.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    }
                    else if (!valid.supplier) {
                        errors["supplier"] = i18n.__("UnitPaymentOrder.supplier.isRequired:%s name is required", i18n.__("UnitPaymentOrder.supplier._:Category")); //"Category tidak boleh kosong";
                    }
                    if (!valid.categoryId) {
                        errors["category"] = i18n.__("UnitPaymentOrder.category.isRequired:%s name is required", i18n.__("UnitPaymentOrder.category._:Category")); //"Category tidak boleh kosong";
                    }
                    else if (valid.category) {
                        if (!valid.supplier._id)
                            errors["category"] = i18n.__("UnitPaymentOrder.category.isRequired:%s name is required", i18n.__("UnitPaymentOrder.category._:Category")); //"Category tidak boleh kosong";
                    }
                    else if (!valid.category) {
                        errors["category"] = i18n.__("UnitPaymentOrder.category.isRequired:%s name is required", i18n.__("UnitPaymentOrder.category._:Category")); //"Category tidak boleh kosong";
                    }
                    if (!valid.dueDate || valid.dueDate == '') {
                        errors["dueDate"] = i18n.__("UnitPaymentOrder.dueDate.isRequired:%s is required", i18n.__("UnitPaymentOrder.dueDate._:DueDate")); //tanggal jatuh tempo tidak boleh kosong";
                    }
                    if (!valid.paymentMethod || valid.paymentMethod == '') {
                        errors["paymentMethod"] = i18n.__("UnitPaymentOrder.paymentMethod.isRequired:%s is required", i18n.__("UnitPaymentOrder.paymentMethod._:PaymentMethod")); //Term pembayaran tidak boleh kosong";
                    }
                    if (!valid.currency) {
                        errors["currency"] = i18n.__("UnitPaymentOrder.currency.isRequired:%s name is required", i18n.__("UnitPaymentOrder.currency._:Currency")); //"currency tidak boleh kosong";
                    }
                    // if (valid.useVat) {
                    //     if (valid.vat) {
                    //         if (!valid.vat._id) {
                    //             errors["vat"] = i18n.__("UnitPaymentOrder.vat.isRequired:%s name is required", i18n.__("UnitPaymentOrder.vat._:Jenis PPh"));
                    //         }
                    //     } else {
                    //         errors["vat"] = i18n.__("UnitPaymentOrder.vat.isRequired:%s name is required", i18n.__("UnitPaymentOrder.vat._:Jenis PPh"));
                    //     }

                    //     if (!valid.vatNo || valid.vatNo == '') {
                    //         errors["vatNo"] = i18n.__("UnitPaymentOrder.vatNo.isRequired:%s is required", i18n.__("UnitPaymentOrder.vatNo._:Nomor Faktur Pajak (PPh)"));
                    //     }

                    //     if (!valid.vatDate || valid.vatDate == '') {
                    //         errors["vatDate"] = i18n.__("UnitPaymentOrder.vatDate.isRequired:%s is required", i18n.__("UnitPaymentOrder.vatDate._:Tanggal Faktur Pajak (PPh)"));
                    //     }
                    // }
                    if (valid.useIncomeTax) {
                        if (!valid.incomeTaxNo || valid.incomeTaxNo == '') {
                            errors["incomeTaxNo"] = i18n.__("UnitPaymentOrder.incomeTaxNo.isRequired:%s is required", i18n.__("UnitPaymentOrder.incomeTaxNo._:Nomor Faktur Pajak (PPn)"));
                        }

                        if (!valid.incomeTaxDate || valid.incomeTaxDate == '') {
                            errors["incomeTaxDate"] = i18n.__("UnitPaymentOrder.incomeTaxDate.isRequired:%s is required", i18n.__("UnitPaymentOrder.incomeTaxDate._:Tanggal Faktur Pajak (PPn)"));
                        }
                    }

                    if (valid.items) {
                        if (valid.items.length <= 0) {
                            errors["items"] = i18n.__("UnitPaymentOrder.items.isRequired:%s is required", i18n.__("UnitPaymentOrder.items._:Item")); //"Harus ada minimal 1 barang";
                        }
                    }
                    else {
                        errors["items"] = i18n.__("UnitPaymentOrder.items.isRequired:%s is required", i18n.__("UnitPaymentOrder.items._:Item")); //"Harus ada minimal 1 barang";
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('unitPaymentOrder does not pass validation', errors));
                    }
                    if (!valid.useVat) {
                        valid.vatNo = "";
                        valid.vatDate = null;
                        valid.vatRate = 0;
                        valid.useVat = false;
                    }
                    if (!valid.useIncomeTax) {
                        valid.incomeTaxNo = "";
                        valid.incomeTaxDate = null;
                        valid.useIncomeTax = false;
                    }
                    valid.divisionId = new ObjectId(valid.divisionId);
                    valid.division = valid.division;
                    valid.division._id = new ObjectId(valid.division._id);
                    valid.supplierId = new ObjectId(valid.supplierId);
                    valid.supplier._id = new ObjectId(valid.supplierId);
                    valid.date = new Date(valid.date);
                    valid.invoceDate = new Date(valid.invoceDate);
                    valid.dueDate = new Date(valid.dueDate);

                    if (valid.category != null) {
                        valid.categoryId = new ObjectId(valid.categoryId);
                        valid.category._id = new ObjectId(valid.category._id);
                    }
                    if (valid.currency != null) {
                        valid.currency._id = new ObjectId(valid.currency._id);
                    }
                    if (valid.vat != null) {
                        valid.vat._id = new ObjectId(valid.vat._id);
                    }

                    for (var item of valid.items) {
                        for (var _urn of getURN) {
                            if (item.unitReceiptNoteId.toString() === _urn._id.toString()) {
                                item.unitReceiptNoteId = new ObjectId(_urn._id);
                                item.unitReceiptNote = new UnitReceiptNote(item.unitReceiptNote);
                                break;
                            }
                        }
                    }

                    if (!valid.stamp) {
                        valid = new UnitPaymentOrder(valid);
                    }

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })

        });
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};

        var query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterNo = {
                'no': {
                    '$regex': regex
                }
            };

            var filterSupplierName = {
                'supplier.name': {
                    '$regex': regex
                }
            };

            var filterUnitDivision = {
                "unit.division": {
                    '$regex': regex
                }
            };
            var filterUnitSubDivision = {
                "unit.subDivision": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplierName, filterUnitDivision, filterUnitSubDivision]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    _beforeInsert(unitPaymentOrder) {
        unitPaymentOrder.no = generateCode();
        return Promise.resolve(unitPaymentOrder)
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((unitPaymentOrder) => this.getRealization(unitPaymentOrder))
            .then((realizations) => this.updatePurchaseOrder(realizations))
            .then((realizations) => this.updateUnitReceiptNote(realizations))
            .then(() => {
                return this.syncItems(id);
            })
    }

    _beforeUpdate(unitPaymentOrder) {
        return this.getSingleById(unitPaymentOrder._id)
            .then((oldUnitPaymentOrder) => {
                return this.mergeUnitPaymentOrder(unitPaymentOrder, oldUnitPaymentOrder);
            })

    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((unitPaymentOrder) => this.getRealization(unitPaymentOrder))
            .then((realizations) => this.updatePurchaseOrderUpdateUnitPaymentOrder(realizations))
            .then((realizations) => this.updateUnitReceiptNote(realizations))
            .then(() => {
                return this.syncItems(id);
            })
    }

    getRealization(unitPaymentOrder) {
        var realizations = unitPaymentOrder.items.map((unitPaymentOrderItem) => {
            return unitPaymentOrderItem.unitReceiptNote.items.map((item) => {
                return {
                    unitPaymentOrder: unitPaymentOrder,
                    unitReceiptNoteId: unitPaymentOrderItem.unitReceiptNoteId,
                    unitReceiptNoteNo: unitPaymentOrderItem.unitReceiptNote.no,
                    purchaseOrderId: item.purchaseOrderId,
                    productId: item.product._id,
                    deliveredQuantity: item.deliveredQuantity,
                    pricePerDealUnit: item.pricePerDealUnit,
                    currency: item.purchaseOrder.currency
                }
            })
        })
        realizations = [].concat.apply([], realizations);
        return Promise.resolve(realizations);
    }

    mergeUnitPaymentOrder(newUnitPaymentOrder, oldUnitPaymentOrder) {
        return this.getRealization(newUnitPaymentOrder)
            .then((newRealizations) => {
                return this.getRealization(oldUnitPaymentOrder)
                    .then((oldRealizations) => {
                        var _newRealizations = [];
                        var _oldRealizations = [];
                        for (var oldRealization of oldRealizations) {
                            var realization = newRealizations.find(item => item.unitReceiptNoteId.toString() === oldRealization.unitReceiptNoteId.toString());

                            if (!realization) {
                                _oldRealizations.push(newRealization);
                            }
                        }

                        for (var newRealization of newRealizations) {
                            var realization = oldRealizations.find(item => item.unitReceiptNoteId.toString() === newRealization.unitReceiptNoteId.toString());

                            if (!realization) {
                                _newRealizations.push(newRealization);
                            }
                        }
                        return _oldRealizations.length > 0 ? this.updatePurchaseOrderDeleteUnitPaymentOrder(_oldRealizations) : Promise.resolve(null)
                            .then((res) => {
                                return _newRealizations.length > 0 ? this.updatePurchaseOrder(_newRealizations) : Promise.resolve(null)
                            })
                            .then((res) => { return Promise.resolve(newUnitPaymentOrder) });
                    })
            });
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
                    for (var realization of realizations) {
                        var unitPaymentOrder = realization.unitPaymentOrder;
                        var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === realization.productId.toString());
                        var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.unitReceiptNoteNo === realization.unitReceiptNoteNo);

                        fulfillment.invoiceDate = unitPaymentOrder.invoceDate;
                        fulfillment.invoiceNo = unitPaymentOrder.invoceNo;
                        fulfillment.interNoteDate = unitPaymentOrder.date;
                        fulfillment.interNoteNo = unitPaymentOrder.no;
                        fulfillment.interNoteValue = realization.pricePerDealUnit * realization.currency.rate;
                        fulfillment.interNoteDueDate = unitPaymentOrder.dueDate;
                        if (unitPaymentOrder.useIncomeTax) {
                            fulfillment.ppnNo = unitPaymentOrder.incomeTaxNo;
                            fulfillment.ppnDate = unitPaymentOrder.incomeTaxDate
                            fulfillment.ppnValue = 0.1 * realization.deliveredQuantity * realization.pricePerDealUnit * realization.currency.rate;
                        }
                        if (unitPaymentOrder.useVat) {
                            fulfillment.pphNo = unitPaymentOrder.vatNo;
                            fulfillment.pphValue = unitPaymentOrder.vatRate * realization.deliveredQuantity * realization.pricePerDealUnit * realization.currency.rate;
                            fulfillment.pphDate = unitPaymentOrder.vatDate;
                        }
                    }

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
                                .map(fulfillment => fulfillment.unitReceiptNoteDeliveredQuantity)
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
                    return this.purchaseOrderManager.update(purchaseOrder);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrderUpdateUnitPaymentOrder(realizations) {
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
                    for (var realization of realizations) {
                        var unitPaymentOrder = realization.unitPaymentOrder;
                        var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === realization.productId.toString());
                        var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.unitReceiptNoteNo === realization.unitReceiptNoteNo && fulfillment.interNoteNo === unitPaymentOrder.no);

                        fulfillment.invoiceDate = unitPaymentOrder.invoceDate;
                        fulfillment.invoiceNo = unitPaymentOrder.invoceNo;
                        fulfillment.interNoteDate = unitPaymentOrder.date;
                        fulfillment.interNoteNo = unitPaymentOrder.no;
                        fulfillment.interNoteValue = realization.pricePerDealUnit * realization.currency.rate;
                        fulfillment.interNoteDueDate = unitPaymentOrder.dueDate;
                        if (unitPaymentOrder.useIncomeTax) {
                            fulfillment.ppnNo = unitPaymentOrder.incomeTaxNo;
                            fulfillment.ppnDate = unitPaymentOrder.incomeTaxDate
                            fulfillment.ppnValue = 0.1 * realization.deliveredQuantity * realization.pricePerDealUnit * realization.currency.rate;
                        }
                        if (unitPaymentOrder.useVat) {
                            fulfillment.pphNo = unitPaymentOrder.vatNo;
                            fulfillment.pphValue = unitPaymentOrder.vatRate * realization.deliveredQuantity * realization.pricePerDealUnit * realization.currency.rate;
                            fulfillment.pphDate = unitPaymentOrder.vatDate;
                        }
                    }

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
                                .map(fulfillment => fulfillment.unitReceiptNoteDeliveredQuantity)
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
                    return this.purchaseOrderManager.update(purchaseOrder);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrderDeleteUnitPaymentOrder(realizations) {
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
                    for (var realization of realizations) {
                        var unitPaymentOrder = realization.unitPaymentOrder;
                        var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === realization.productId.toString());
                        var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.unitReceiptNoteNo === realization.unitReceiptNoteNo && fulfillment.interNoteNo === unitPaymentOrder.no);
                        if (fulfillment) {
                            delete fulfillment.invoiceDate;
                            delete fulfillment.invoiceNo;
                            delete fulfillment.interNoteDate;
                            delete fulfillment.interNoteNo;
                            delete fulfillment.interNoteValue;
                            delete fulfillment.interNoteDueDate;
                            if (unitPaymentOrder.useIncomeTax) {
                                delete fulfillment.ppnNo;
                                delete fulfillment.ppnDate;
                                delete fulfillment.ppnValue;
                            }
                            if (unitPaymentOrder.useVat) {
                                delete fulfillment.pphNo;
                                delete fulfillment.pphValue;
                                delete fulfillment.pphDate;
                            }

                        }
                    }
                    var isPaid = purchaseOrder.items
                        .map((item) => {
                            return item.fulfillments
                                .map((fulfillment) => fulfillment.hasOwnProperty("interNoteNo"))
                                .reduce((prev, curr, index) => {
                                    return prev || curr
                                }, false);
                        })
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, false);

                    purchaseOrder.status = isPaid && purchaseOrder.isClosed ? poStatusEnum.PAYMENT : (purchaseOrder.isClosed ? poStatusEnum.RECEIVED : poStatusEnum.RECEIVING);
                    purchaseOrder.status = purchaseOrder.status.value === 7 && fulfillment.unitReceiptNoteDeliveredQuantity < fulfillment.deliveryOrderDeliveredQuantity ? poStatusEnum.RECEIVING : poStatusEnum.RECEIVED;

                    return this.purchaseOrderManager.update(purchaseOrder);
                })
            jobs.push(job);
        })
        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updateUnitReceiptNote(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.unitReceiptNoteId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization.purchaseOrderId);
        }

        var jobs = [];
        map.forEach((purchaseOrderIds, unitReceiptNoteId) => {
            var job = this.unitReceiptNoteManager.getSingleById(unitReceiptNoteId)
                .then((unitReceiptNote) => {
                    return Promise.all(purchaseOrderIds.map((purchaseOrderId) => {
                        return this.purchaseOrderManager.getSingleById(purchaseOrderId)
                    }))
                        .then((purchaseOrders) => {
                            for (var purchaseOrder of purchaseOrders) {
                                var item = unitReceiptNote.items.find(item => item.purchaseOrderId.toString() === purchaseOrder._id.toString());
                                var index = unitReceiptNote.items.indexOf(item);
                                unitReceiptNote.items[index].purchaseOrder = purchaseOrder;
                            }
                            unitReceiptNote.isPaid = true;
                            return this.unitReceiptNoteManager.update(unitReceiptNote);
                        })
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updateUnitReceiptNoteDeleteUnitPaymentOrder(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.unitReceiptNoteId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization.purchaseOrderId);
        }

        var jobs = [];
        map.forEach((purchaseOrderIds, unitReceiptNoteId) => {
            var job = this.unitReceiptNoteManager.getSingleById(unitReceiptNoteId)
                .then((unitReceiptNote) => {
                    return Promise.all(purchaseOrderIds.map((purchaseOrderId) => {
                        return this.purchaseOrderManager.getSingleById(purchaseOrderId)
                    }))
                        .then((purchaseOrders) => {
                            for (var purchaseOrder of purchaseOrders) {
                                var item = unitReceiptNote.items.find(item => item.purchaseOrderId.toString() === purchaseOrder._id.toString());
                                var index = unitReceiptNote.items.indexOf(item);
                                unitReceiptNote.items[index].purchaseOrder = purchaseOrder;
                            }
                            unitReceiptNote.isPaid = false;
                            return this.unitReceiptNoteManager.update(unitReceiptNote);
                        })
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    delete(unitPaymentOrder) {
        return this._pre(unitPaymentOrder)
            .then((validData) => {
                validData._deleted = true;
                return this.collection.update(validData)
                    .then((id) => {
                        var query = {
                            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
                        };
                        return this.getSingleByQuery(query)
                            .then((unitPaymentOrder) => this.getRealization(unitPaymentOrder))
                            .then((realizations) => this.updatePurchaseOrderDeleteUnitPaymentOrder(realizations))
                            .then((realizations) => this.updateUnitReceiptNoteDeleteUnitPaymentOrder(realizations))
                            .then(() => {
                                return this.syncItems(id);
                            })
                    })
            });
    }

    syncItems(id) {
        var query = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
        };
        return this.getSingleByQuery(query)
            .then((unitPaymentOrder) => {
                var getUnitReceiptNotes = unitPaymentOrder.items.map((unitPaymentOrderItem) => {
                    return this.unitReceiptNoteManager.getSingleById(unitPaymentOrderItem.unitReceiptNoteId)
                })
                return Promise.all(getUnitReceiptNotes)
                    .then((unitReceiptNotes) => {
                        for (var unitPaymentOrderItem of unitPaymentOrder.items) {
                            var item = unitReceiptNotes.find(unitReceiptNote => unitPaymentOrderItem.unitReceiptNoteId.toString() === unitReceiptNote._id.toString())
                            unitPaymentOrderItem.unitReceiptNote = item;
                        }
                        return this.collection
                            .updateOne({
                                _id: unitPaymentOrder._id
                            }, {
                                $set: unitPaymentOrder
                            })
                            .then((result) => Promise.resolve(unitPaymentOrder._id));
                    })
            })
    }

    pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(unitPaymentOrder => {
                    var getDefinition = require('../../pdf/definitions/unit-payment-order');
                    var definition = getDefinition(unitPaymentOrder);

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

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.UnitPaymentOrder}_date`,
            key: {
                date: -1
            }
        }

        var noIndex = {
            name: `ix_${map.purchasing.collection.UnitPaymentOrder}_no`,
            key: {
                no: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    getAllData(filter) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var query = Object.assign({});
                    query = Object.assign(query, filter);
                    query = Object.assign(query, {
                        _deleted: false
                    });

                    var _select = ["no",
                        "date",
                        "supplier",
                        "invoceNo",
                        "invoceDate",
                        "dueDate",
                        "remark",
                        "useIncomeTax",
                        "incomeTaxNo",
                        "incomeTaxDate",
                        "useVat",
                        "vat",
                        "vatNo",
                        "vatDate",
                        "_createdBy",
                        "category.name",
                        "items.unitReceiptNote.no",
                        "items.unitReceiptNote.date",
                        "items.unitReceiptNote.items.purchaseOrder.purchaseOrderExternal.no",
                        "items.unitReceiptNote.items.purchaseOrder.items.product",
                        "items.unitReceiptNote.items.purchaseOrder.items.useIncomeTax",
                        "items.unitReceiptNote.items.purchaseOrder.purchaseRequest.no",
                        "items.unitReceiptNote.items.product",
                        "items.unitReceiptNote.items.deliveredQuantity",
                        "items.unitReceiptNote.items.deliveredUom",
                        "items.unitReceiptNote.items.pricePerDealUnit",
                        "items.unitReceiptNote.items.currency"];

                    this.collection.where(query).select(_select).execute()
                        .then((results) => {
                            resolve(results.data);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }
};