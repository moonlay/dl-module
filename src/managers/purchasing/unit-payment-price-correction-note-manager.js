'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var PurchaseOrderManager = require('./purchase-order-manager');
var UnitPaymentCorrectionNote = DLModels.purchasing.UnitPaymentCorrectionNote;
var UnitPaymentOrderManager = require('./unit-payment-order-manager');
var UnitReceiptNoteManager = require('./unit-receipt-note-manager');
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');

module.exports = class UnitPaymentPriceCorrectionNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitPaymentCorrectionNote);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.unitReceiptNoteManager = new UnitReceiptNoteManager(db, user);
    }

    _validate(unitPaymentPriceCorrectionNote) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = unitPaymentPriceCorrectionNote;

            var getUnitPaymentPriceCorrectionNote = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        "no": valid.no
                    }, {
                        _deleted: false
                    }]
            });

            var getUnitPaymentOrder = valid.unitPaymentOrder && ObjectId.isValid(valid.unitPaymentOrder._id) ? this.unitPaymentOrderManager.getSingleByIdOrDefault(valid.unitPaymentOrder._id) : Promise.resolve(null);

            var getPOInternal = [];
            valid.items = valid.items || [];
            var poId = new ObjectId();
            for (var _item of valid.items) {
                if (ObjectId.isValid(_item.purchaseOrderId)) {
                    if (!poId.equals(_item.purchaseOrderId)) {
                        poId = new ObjectId(_item.purchaseOrderId);
                        getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(_item.purchaseOrderId));
                    }
                }
            }

            Promise.all([getUnitPaymentPriceCorrectionNote, getUnitPaymentOrder].concat(getPOInternal))
                .then(results => {
                    var _unitPaymentPriceCorrectionNote = results[0];
                    var _unitPaymentOrder = results[1];
                    var _poInternals = results.slice(2, results.length);
                    var now = new Date();

                    // if (!valid.no || valid.no == '')
                    //     errors["no"] = i18n.__("UnitPaymentPriceCorrectionNote.no.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.no._:No"));
                    if (_unitPaymentPriceCorrectionNote)
                        errors["no"] = i18n.__("UnitPaymentPriceCorrectionNote.no.isExists:%s is already exists", i18n.__("UnitPaymentPriceCorrectionNote.no._:No"));

                    if (!_unitPaymentOrder)
                        errors["unitPaymentOrder"] = i18n.__("UnitPaymentPriceCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.unitPaymentOrder._:Unit Payment Order"));
                    else if (!valid.unitPaymentOrderId)
                        errors["unitPaymentOrder"] = i18n.__("UnitPaymentPriceCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.unitPaymentOrder._:Unit Payment Order"));
                    else if (valid.unitPaymentOrder) {
                        if (!valid.unitPaymentOrder._id)
                            errors["unitPaymentOrder"] = i18n.__("UnitPaymentPriceCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.unitPaymentOrder._:Unit Payment Order"));
                    }
                    else if (!valid.unitPaymentOrder)
                        errors["unitPaymentOrder"] = i18n.__("UnitPaymentPriceCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.unitPaymentOrder._:Unit Payment Order"));

                    // if (!valid.invoiceCorrectionNo || valid.invoiceCorrectionNo == '')
                    // errors["invoiceCorrectionNo"] = i18n.__("UnitPaymentPriceCorrectionNote.invoiceCorrectionNo.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.invoiceCorrectionNo._:Invoice Correction No"));

                    // if (!valid.invoiceCorrectionDate || valid.invoiceCorrectionDate == '')
                    //     errors["invoiceCorrectionDate"] = i18n.__("UnitPaymentPriceCorrectionNote.invoiceCorrectionDate.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.invoiceCorrectionDate._:Invoice Correction Date"));

                    if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("UnitPaymentPriceCorrectionNote.date.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.date._:Correction Date"));

                    if (valid.items) {
                        if (valid.items.length > 0) {
                            var itemErrors = [];
                            for (var item of valid.items) {
                                var itemError = {};
                                if (item.pricePerUnit <= 0) {
                                    itemError["pricePerUnit"] = i18n.__("UnitPaymentPriceCorrectionNote.items.pricePerUnit.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.items.pricePerUnit._:Price Per Unit"));
                                }
                                if (item.priceTotal <= 0) {
                                    itemError["priceTotal"] = i18n.__("UnitPaymentPriceCorrectionNote.items.priceTotal.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.items.priceTotal._:Total Price"));
                                }
                                for (var _unitReceiptNote of _unitPaymentOrder.items) {
                                    for (var _unitReceiptNoteItem of _unitReceiptNote.unitReceiptNote.items) {
                                        if (_unitReceiptNoteItem.product._id.toString() === item.product._id.toString()) {
                                            if (_unitReceiptNoteItem.correction.length > 0) {
                                                if (valid.correctionType === "Harga Satuan") {
                                                    if (item.pricePerUnit === _unitReceiptNoteItem.correction[_unitReceiptNoteItem.correction.length - 1].correctionPricePerUnit) {
                                                        itemError["pricePerUnit"] = i18n.__("UnitPaymentPriceCorrectionNote.items.pricePerUnit.noChanges:%s doesn't change", i18n.__("UnitPaymentPriceCorrectionNote.items.pricePerUnit._:Price Per Unit"));
                                                    }
                                                }
                                                else if (valid.correctionType === "Harga Total") {
                                                    if (item.priceTotal === _unitReceiptNoteItem.correction[_unitReceiptNoteItem.correction.length - 1].correctionPriceTotal) {
                                                        itemError["priceTotal"] = i18n.__("UnitPaymentPriceCorrectionNote.items.priceTotal.noChanges:%s doesn't change", i18n.__("UnitPaymentPriceCorrectionNote.items.priceTotal._:Total Price"));
                                                    }
                                                }
                                            }
                                            break;
                                        }
                                    }
                                }
                                itemErrors.push(itemError);
                            }
                            for (var itemError of itemErrors) {
                                for (var prop in itemError) {
                                    errors.items = itemErrors;
                                    break;
                                }
                                if (errors.items)
                                    break;
                            }
                        }

                        // if (valid.items.length == 0)
                        //     errors["items"] = i18n.__("UnitPaymentPriceCorrectionNote.items.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.items._:Item"));
                    }
                    else {
                        errors["items"] = i18n.__("UnitPaymentPriceCorrectionNote.items.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.items._:Item"));
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.unitPaymentOrderId = _unitPaymentOrder._id;
                    valid.unitPaymentOrder = _unitPaymentOrder;
                    valid.date = new Date(valid.date);

                    if (valid.invoiceCorrectionDate) {
                        valid.invoiceCorrectionDate = new Date(valid.invoiceCorrectionDate);
                    } else {
                        valid.vatTaxCorrectionDate = null;
                    }

                    if (valid.incomeTaxCorrectionDate) {
                        valid.incomeTaxCorrectionDate = new Date(valid.incomeTaxCorrectionDate);
                    } else {
                        valid.vatTaxCorrectionDate = null;
                    }

                    if (valid.vatTaxCorrectionDate) {
                        valid.vatTaxCorrectionDate = new Date(valid.vatTaxCorrectionDate);
                    } else {
                        valid.vatTaxCorrectionDate = null;
                    }

                    for (var item of valid.items) {
                        for (var _unitPaymentOrderItem of _unitPaymentOrder.items) {
                            for (var _unitReceiptNoteItem of _unitPaymentOrderItem.unitReceiptNote.items) {
                                var _purchaseOrderId = new ObjectId(item.purchaseOrderId);
                                var _productId = new ObjectId(item.productId);

                                if (_purchaseOrderId.equals(_unitReceiptNoteItem.purchaseOrder._id) && _productId.equals(_unitReceiptNoteItem.product._id)) {
                                    for (var _poInternal of _poInternals) {
                                        if (_poInternal._id.equals(_unitReceiptNoteItem.purchaseOrder._id)) {
                                            item.purchaseOrderId = new ObjectId(_poInternal._id);
                                            item.purchaseOrder = _poInternal;
                                            item.productId = new ObjectId(_unitReceiptNoteItem.product._id);
                                            item.product = _unitReceiptNoteItem.product;
                                            item.product._id = new ObjectId(_unitReceiptNoteItem.product._id);
                                            item.uom = _unitReceiptNoteItem.deliveredUom;
                                            item.uomId = new ObjectId(_unitReceiptNoteItem.deliveredUom._id);
                                            item.uom._id = new ObjectId(_unitReceiptNoteItem.deliveredUom._id);
                                            item.currency = _unitReceiptNoteItem.currency;
                                            item.currencyRate = _unitReceiptNoteItem.currencyRate;
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }

                    if (!valid.stamp)
                        valid = new UnitPaymentCorrectionNote(valid);

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
            _deleted: false,
            $or: [
                { correctionType: "Harga Satuan" },
                { correctionType: "Harga Total" }
            ]
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

            var filterSupplierName = {
                'unitPaymentOrder.supplier.name': {
                    '$regex': regex
                }
            };

            var filterUnitCoverLetterNo = {
                "unitCoverLetterNo": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplierName, filterUnitCoverLetterNo]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
    }

    pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(unitPaymentPriceCorrectionNote => {
                    var getDefinition = require('../../pdf/definitions/unit-payment-correction-note');

                    var _unitReceiptNotes = unitPaymentPriceCorrectionNote.unitPaymentOrder.items.map((upoItem) => {
                        return upoItem.unitReceiptNote.items.map((item) => {
                            return {
                                productId: item.product._id,
                                purchaseOrderId: item.purchaseOrderId,
                                correction: item.correction
                            }
                        })
                    });
                    var pos = unitPaymentPriceCorrectionNote.items.map((_item) => {
                        return _item.purchaseOrder.items.map((item) => {
                            return {
                                productId: item.product._id,
                                purchaseOrderId: _item.purchaseOrderId,
                                pricePerDealUnit: item.pricePerDealUnit
                            }
                        })
                    });

                    _unitReceiptNotes = [].concat.apply([], _unitReceiptNotes);
                    pos = [].concat.apply([], pos);
                    for (var _item of unitPaymentPriceCorrectionNote.items) {
                        var pricePerUnit = 0, priceTotal = 0;
                        var unitReceiptNote = _unitReceiptNotes.find((unitReceiptNote) => unitReceiptNote.productId.toString() === _item.productId.toString() && unitReceiptNote.purchaseOrderId.toString() === _item.purchaseOrderId.toString());
                        var po = pos.find((unitReceiptNote) => unitReceiptNote.productId.toString() === _item.productId.toString() && unitReceiptNote.purchaseOrderId.toString() === _item.purchaseOrderId.toString());

                        if (unitReceiptNote.correction.length > 1) {
                            if (unitPaymentPriceCorrectionNote.correctionType === "Harga Satuan") {
                                pricePerUnit = _item.pricePerUnit - unitReceiptNote.correction[unitReceiptNote.correction.length - 1].correctionPricePerUnit;
                                priceTotal = pricePerUnit * _item.quantity;
                            }
                            else if (unitPaymentPriceCorrectionNote.correctionType === "Harga Total") {
                                pricePerUnit = _item.pricePerUnit;
                                priceTotal = (_item.priceTotal) - (_item.quantity * unitReceiptNote.correction[unitReceiptNote.correction.length - 1].correctionPricePerUnit);
                            }
                        } else {
                            if (unitPaymentPriceCorrectionNote.correctionType === "Harga Satuan") {
                                pricePerUnit = _item.pricePerUnit - po.pricePerDealUnit;
                                priceTotal = pricePerUnit * _item.quantity;
                            }
                            else if (unitPaymentPriceCorrectionNote.correctionType === "Harga Total") {
                                pricePerUnit = _item.pricePerUnit;
                                priceTotal = (_item.priceTotal) - (_item.quantity * po.pricePerDealUnit);
                            }
                        }

                        _item.pricePerUnit = pricePerUnit;
                        _item.priceTotal = priceTotal;

                    }
                    var definition = getDefinition(unitPaymentPriceCorrectionNote);
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

    _beforeInsert(unitPaymentPriceCorrectionNote) {
        unitPaymentPriceCorrectionNote.no = generateCode();
        if (unitPaymentPriceCorrectionNote.unitPaymentOrder.useIncomeTax)
            unitPaymentPriceCorrectionNote.returNoteNo = generateCode();
        return Promise.resolve(unitPaymentPriceCorrectionNote)
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((unitPaymentPriceCorrectionNote) => this.updatePurchaseOrder(unitPaymentPriceCorrectionNote))
            .then((unitPaymentPriceCorrectionNote) => this.updateUnitReceiptNote(unitPaymentPriceCorrectionNote))
            .then(() => {
                return this.syncItems(id);
            })
    }

    updatePurchaseOrder(unitPaymentPriceCorrectionNote) {
        var _items = unitPaymentPriceCorrectionNote.items.map(item => {
            return {
                purchaseOrderId: item.purchaseOrderId,
                productId: item.productId,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                priceTotal: item.priceTotal,
                currency: item.currency,
                unitReceiptNoteNo: item.unitReceiptNoteNo
            };
        });
        _items = [].concat.apply([], _items);

        var map = new Map();
        for (var _item of _items) {
            var key = _item.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, []);
            var item = {
                productId: _item.productId,
                quantity: _item.quantity,
                pricePerUnit: _item.pricePerUnit,
                priceTotal: _item.priceTotal,
                currency: _item.currency,
                unitReceiptNoteNo: _item.unitReceiptNoteNo
            };
            map.get(key).push(item);
        }

        var jobs = [];
        map.forEach((items, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    for (var item of items) {
                        var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === item.productId.toString());

                        var fulfillment = poItem.fulfillments.find(fulfillment => item.unitReceiptNoteNo === fulfillment.unitReceiptNoteNo && unitPaymentPriceCorrectionNote.unitPaymentOrder.no === fulfillment.interNoteNo);

                        if (!fulfillment.correction)
                            fulfillment.correction = [];
                        var _correction = {};
                        _correction.correctionDate = unitPaymentPriceCorrectionNote.date;
                        _correction.correctionNo = unitPaymentPriceCorrectionNote.no;
                        _correction.correctionQuantity = item.quantity;
                        _correction.correctionPriceTotal = (item.priceTotal * item.currency.rate) - (item.quantity * poItem.pricePerDealUnit * item.currency.rate);
                        _correction.correctionRemark = `Koreksi ${unitPaymentPriceCorrectionNote.correctionType}`;
                        fulfillment.correction.push(_correction);

                    }
                    return this.purchaseOrderManager.update(purchaseOrder);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(unitPaymentPriceCorrectionNote);
        })
    }

    updateUnitReceiptNote(unitPaymentPriceCorrectionNote) {
        var _items = unitPaymentPriceCorrectionNote.items.map(item => {
            return {
                purchaseOrderId: item.purchaseOrderId,
                productId: item.productId,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                priceTotal: item.priceTotal,
                currency: item.currency,
                unitReceiptNoteNo: item.unitReceiptNoteNo
            }
        });
        _items = [].concat.apply([], _items);

        var map = new Map();
        for (var _item of _items) {
            var key = _item.unitReceiptNoteNo.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(_item.purchaseOrderId);
        }

        var unitReceiptNoteIds = [];
        for (var upoItem of unitPaymentPriceCorrectionNote.unitPaymentOrder.items) {
            unitReceiptNoteIds.push(upoItem.unitReceiptNoteId);
        }

        var jobs = [];
        for (var unitReceiptNoteId of unitReceiptNoteIds) {
            var job = this.unitReceiptNoteManager.getSingleById(unitReceiptNoteId)
                .then((unitReceiptNote) => {
                    var _item = map.get(unitReceiptNote.no);
                    return Promise.all(_item.map((item) => {
                        return this.purchaseOrderManager.getSingleById(item.purchaseOrderId)
                    }))
                        .then((purchaseOrders) => {
                            for (var item of unitReceiptNote.items) {
                                var purchaseOrder = purchaseOrders.find((_purchaseOrder) => _purchaseOrder._id.toString() === item.purchaseOrderId.toString());
                                var correctionItem = _items.find((_item) => _item.purchaseOrderId.toString() === item.purchaseOrderId.toString() && _item.productId.toString() === item.product._id.toString() && unitReceiptNote.no === _item.unitReceiptNoteNo);
                                item.purchaseOrder = purchaseOrder;
                                var _correction = {
                                    correctionDate: unitPaymentPriceCorrectionNote.date,
                                    correctionNo: unitPaymentPriceCorrectionNote.no,
                                    correctionQuantity: correctionItem.quantity,
                                    correctionPricePerUnit: correctionItem.pricePerUnit,
                                    correctionPriceTotal: correctionItem.priceTotal,
                                    correctionRemark: `Koreksi ${unitPaymentPriceCorrectionNote.correctionType}`
                                };
                                item.correction.push(_correction);
                            }
                            return this.unitReceiptNoteManager.update(unitReceiptNote);
                        })
                })
            jobs.push(job);
        }

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(unitPaymentPriceCorrectionNote);
        })
    }

    syncItems(id) {
        var query = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
        };
        return this.getSingleByQuery(query)
            .then((unitPaymentPriceCorrectionNote) => {
                return this.unitPaymentOrderManager.syncItems(unitPaymentPriceCorrectionNote.unitPaymentOrderId)
                    .then((res) => {
                        return this.unitPaymentOrderManager.getSingleById(unitPaymentPriceCorrectionNote.unitPaymentOrderId)
                            .then((unitPaymentOrder) => {
                                var getPurchaseOrderIds = unitPaymentPriceCorrectionNote.items.map((unitPaymentOrderItem) => {
                                    return this.purchaseOrderManager.getSingleById(unitPaymentOrderItem.purchaseOrderId)
                                })
                                return Promise.all(getPurchaseOrderIds)
                                    .then((purchaseOrders) => {
                                        for (var unitPaymentOrderItem of unitPaymentPriceCorrectionNote.items) {
                                            var purchaseOrder = purchaseOrders.find(_purchaseOrder => unitPaymentOrderItem.purchaseOrderId.toString() === _purchaseOrder._id.toString());
                                            unitPaymentOrderItem.purchaseOrder = purchaseOrder;
                                        }
                                        unitPaymentPriceCorrectionNote.unitPaymentOrder = unitPaymentOrder;
                                        return this.collection
                                            .updateOne({
                                                _id: unitPaymentPriceCorrectionNote._id
                                            }, {
                                                $set: unitPaymentPriceCorrectionNote
                                            })
                                            .then((result) => Promise.resolve(unitPaymentPriceCorrectionNote._id));
                                    })
                            })
                    })
            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.UnitPaymentCorrectionNote}_date`,
            key: {
                date: -1
            }
        }

        var noIndex = {
            name: `ix_${map.purchasing.collection.UnitPaymentCorrectionNote}_no`,
            key: {
                no: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    _getQueryAllUnitPaymentCorrection(paging) {
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

            var filterSupplierName = {
                'unitPaymentOrder.supplier.name': {
                    '$regex': regex
                }
            };

            var filterUnitCoverLetterNo = {
                "unitCoverLetterNo": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplierName, filterUnitCoverLetterNo]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
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
                        "correctionType",
                        "unitPaymentOrder.no",
                        "invoiceCorrectionNo",
                        "invoiceCorrectionDate",
                        "incomeTaxCorrectionNo",
                        "incomeTaxCorrectionDate",
                        "vatTaxCorrectionNo",
                        "vatTaxCorrectionDate",
                        "unitPaymentOrder.supplier",
                        "unitPaymentOrder.items.unitReceiptNote.no",
                        "unitPaymentOrder.items.unitReceiptNote.date",
                        "unitPaymentOrder.items.unitReceiptNote.items.purchaseOrder._id",
                        "releaseOrderNoteNo",
                        "remark",
                        "_createdBy",
                        "items.purchaseOrder._id",
                        "items.purchaseOrder.purchaseOrderExternal.no",
                        "items.purchaseOrder.purchaseRequest.no",
                        "items.product",
                        "items.quantity",
                        "items.uom",
                        "items.pricePerUnit",
                        "items.currency",
                        "items.priceTotal"
                    ];

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
}