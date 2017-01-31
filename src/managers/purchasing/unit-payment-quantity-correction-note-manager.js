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

module.exports = class UnitPaymentQuantityCorrectionNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitPaymentCorrectionNote);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.unitReceiptNoteManager = new UnitReceiptNoteManager(db, user);
    }

    _validate(unitPaymentQuantityCorrectionNote) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = unitPaymentQuantityCorrectionNote;

            var getUnitPaymentQuantityCorrectionNote = this.collection.singleOrDefault({
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

            Promise.all([getUnitPaymentQuantityCorrectionNote, getUnitPaymentOrder])
                .then(results => {
                    var _unitPaymentQuantityCorrectionNote = results[0];
                    var _unitPaymentOrder = results[1];
                    var now = new Date();

                    if (_unitPaymentQuantityCorrectionNote)
                        errors["no"] = i18n.__("UnitPaymentQuantityCorrectionNote.no.isExists:%s is already exists", i18n.__("UnitPaymentQuantityCorrectionNote.no._:No"));

                    if (!_unitPaymentOrder)
                        errors["unitPaymentOrder"] = i18n.__("UnitPaymentQuantityCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.unitPaymentOrder._:Unit Payment Order"));
                    else if (!valid.unitPaymentOrderId)
                        errors["unitPaymentOrder"] = i18n.__("UnitPaymentQuantityCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.unitPaymentOrder._:Unit Payment Order"));
                    else if (valid.unitPaymentOrder) {
                        if (!valid.unitPaymentOrder._id)
                            errors["unitPaymentOrder"] = i18n.__("UnitPaymentQuantityCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.unitPaymentOrder._:Unit Payment Order"));
                    }
                    else if (!valid.unitPaymentOrder)
                        errors["unitPaymentOrder"] = i18n.__("UnitPaymentQuantityCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.unitPaymentOrder._:Unit Payment Order"));

                    // if (!valid.invoiceCorrectionNo || valid.invoiceCorrectionNo == '')
                    //     errors["invoiceCorrectionNo"] = i18n.__("UnitPaymentQuantityCorrectionNote.invoiceCorrectionNo.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.invoiceCorrectionNo._:Invoice Correction No"));

                    if (!valid.releaseOrderNoteNo || valid.releaseOrderNoteNo == '')
                        errors["releaseOrderNoteNo"] = i18n.__("UnitPaymentQuantityCorrectionNote.releaseOrderNoteNo.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.releaseOrderNoteNo._:Release Order Note No"));

                    // if (!valid.invoiceCorrectionDate || valid.invoiceCorrectionDate == '')
                    //     errors["invoiceCorrectionDate"] = i18n.__("UnitPaymentQuantityCorrectionNote.invoiceCorrectionDate.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.invoiceCorrectionDate._:Invoice Correction Date"));

                    if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("UnitPaymentQuantityCorrectionNote.date.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.date._:Correction Date"));

                    if (valid.items) {
                        if (valid.items.length > 0) {
                            var itemErrors = [];
                            for (var item of valid.items) {
                                var itemError = {};
                                for (var _unitPaymentOrderItem of valid.unitPaymentOrder.items) {
                                    for (var _unitReceiptNoteItem of _unitPaymentOrderItem.unitReceiptNote.items) {
                                        if (_unitReceiptNoteItem.purchaseOrderId.toString() === item.purchaseOrderId.toString() && _unitReceiptNoteItem.product._id.toString() === item.productId.toString()) {
                                            if (item.quantity <= 0)
                                                itemError["quantity"] = i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity._:Quantity"));
                                            else if (item.quantity > _unitReceiptNoteItem.deliveredQuantity)
                                                itemError["quantity"] = i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity.lessThan:%s must not be greater than quantity on unit payment order", i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity._:Quantity"));
                                            else if (item.quantity === _unitReceiptNoteItem.deliveredQuantity)
                                                itemError["quantity"] = i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity.noChanges: no changes", i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity._:Quantity"));

                                            itemErrors.push(itemError);
                                            break;
                                        }
                                    }
                                }
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
                    }
                    else {
                        errors["items"] = i18n.__("UnitPaymentQuantityCorrectionNote.items.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.items._:Item"));
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.unitPaymentOrderId = _unitPaymentOrder._id;
                    valid.unitPaymentOrder = _unitPaymentOrder;
                    valid.correctionType = "Jumlah";
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
                                    item.purchaseOrderId = new ObjectId(_unitReceiptNoteItem.purchaseOrder._id);
                                    item.purchaseOrder = _unitReceiptNoteItem.purchaseOrder;
                                    item.purchaseOrder._id = new ObjectId(_unitReceiptNoteItem.purchaseOrder._id);
                                    item.productId = new ObjectId(_unitReceiptNoteItem.product._id);
                                    item.product = _unitReceiptNoteItem.product;
                                    item.product._id = new ObjectId(_unitReceiptNoteItem.product._id);
                                    item.priceTotal = item.quantity * item.pricePerUnit;
                                    item.uom = _unitReceiptNoteItem.deliveredUom;
                                    item.uomId = new ObjectId(_unitReceiptNoteItem.deliveredUom._id);
                                    item.uom._id = new ObjectId(_unitReceiptNoteItem.deliveredUom._id);
                                    item.currency = _unitReceiptNoteItem.currency;
                                    item.currencyRate = _unitReceiptNoteItem.currencyRate;
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
            correctionType: "Jumlah"
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
                .then(unitPaymentQuantityCorrectionNote => {
                    var getDefinition = require('../../pdf/definitions/unit-payment-correction-note');
                    for (var _item of unitPaymentQuantityCorrectionNote.items) {
                        for (var _poItem of _item.purchaseOrder.items) {
                            if (_poItem.product._id.toString() === _item.product._id.toString()) {
                                for (var _fulfillment of _poItem.fulfillments) {
                                    var qty = 0, priceTotal = 0, pricePerUnit = 0;
                                    if (_item.unitReceiptNoteNo === _fulfillment.unitReceiptNoteNo && unitPaymentQuantityCorrectionNote.unitPaymentOrder.no === _fulfillment.interNoteNo) {
                                        priceTotal = _item.quantity * _item.pricePerUnit;
                                        pricePerUnit = _item.pricePerUnit;
                                        _item.pricePerUnit = pricePerUnit;
                                        _item.priceTotal = priceTotal;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }


                    var definition = getDefinition(unitPaymentQuantityCorrectionNote);

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
                        var _qty = 0;
                        _correction.correctionDate = unitPaymentPriceCorrectionNote.date;
                        _correction.correctionNo = unitPaymentPriceCorrectionNote.no;
                        _correction.correctionRemark = `Koreksi ${unitPaymentPriceCorrectionNote.correctionType}`;

                        if (!fulfillment.correction) {
                            fulfillment.correction = [];
                            _correction.correctionQuantity = fulfillment.unitReceiptNoteDeliveredQuantity - item.quantity;
                        } else {
                            var sum = fulfillment.correction
                                .map(corr => corr.correctionRemark == "Koreksi Jumlah" ? corr.deliveryOrderDeliveredQuantity : 0)
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);

                            _correction.correctionQuantity = fulfillment.unitReceiptNoteDeliveredQuantity - item.quantity - sum;
                            _qty = item.quantity + sum - fulfillment.unitReceiptNoteDeliveredQuantity;
                        }
                        _correction.correctionPriceTotal = _qty * item.pricePerUnit * item.currency.rate;
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

    pdfReturNote(id) {
        return new Promise((resolve, reject) => {
            this.getSingleById(id)
                .then(unitPaymentQuantityCorrectionNote => {
                    var getDefinition = require('../../pdf/definitions/unit-payment-correction-retur-note');
                    for (var _item of unitPaymentQuantityCorrectionNote.items) {
                        for (var _poItem of _item.purchaseOrder.items) {
                            if (_poItem.product._id.toString() === _item.product._id.toString()) {
                                for (var _fulfillment of _poItem.fulfillments) {
                                    var qty = 0, priceTotal = 0, pricePerUnit = 0;
                                    if (_item.unitReceiptNoteNo === _fulfillment.unitReceiptNoteNo && unitPaymentQuantityCorrectionNote.unitPaymentOrder.no === _fulfillment.interNoteNo) {
                                        priceTotal = _item.quantity * _item.pricePerUnit;
                                        pricePerUnit = _item.pricePerUnit;
                                        _item.pricePerUnit = pricePerUnit;
                                        _item.priceTotal = priceTotal;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }

                    var definition = getDefinition(unitPaymentQuantityCorrectionNote);
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
}
