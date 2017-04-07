'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var PurchaseOrderManager = require('./purchase-order-manager');
var UnitPaymentCorrectionNote = DLModels.purchasing.UnitPaymentCorrectionNote;
var UnitPaymentOrder = DLModels.purchasing.UnitPaymentOrder;
var UnitPaymentOrderManager = require('./unit-payment-order-manager');
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var UnitReceiptNoteManager = require('./unit-receipt-note-manager');

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
                                var unitReceiptNote = valid.unitPaymentOrder.items.find((upoItem) => item.unitReceiptNoteNo === upoItem.unitReceiptNote.no);
                                var unitReceiptQty = unitReceiptNote.unitReceiptNote.items.find((unitReceiptNoteItem) => item.purchaseOrderId.toString() === unitReceiptNoteItem.purchaseOrderId.toString() && unitReceiptNoteItem.product._id.toString() === item.productId.toString());

                                if (item.quantity <= 0)
                                    itemError["quantity"] = i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity.isRequired:%s is required", i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity._:Quantity"));
                                else if (item.quantity > unitReceiptQty.deliveredQuantity)
                                    itemError["quantity"] = i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity.lessThan:%s must not be greater than quantity on unit payment order", i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity._:Quantity"));
                                else if (item.quantity === unitReceiptQty.deliveredQuantity)
                                    itemError["quantity"] = i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity.noChanges: no changes", i18n.__("UnitPaymentQuantityCorrectionNote.items.quantity._:Quantity"));

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
                                    item.currencyRate = Number(_unitReceiptNoteItem.currencyRate);
                                    break;
                                }
                            }
                        }
                        item.quantity = Number(item.quantity);
                        item.pricePerUnit = Number(item.pricePerUnit);
                        item.priceTotal = Number(item.priceTotal);
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

    _beforeInsert(unitPaymentQuantityCorrectionNote) {
        unitPaymentQuantityCorrectionNote.no = generateCode("correctionPrice");
        if (unitPaymentQuantityCorrectionNote.unitPaymentOrder.useIncomeTax)
            unitPaymentQuantityCorrectionNote.returNoteNo = generateCode("returCode");
        return Promise.resolve(unitPaymentQuantityCorrectionNote)
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((unitPaymentPriceCorrectionNote) => this.updatePurchaseOrder(unitPaymentPriceCorrectionNote))
            .then((unitPaymentPriceCorrectionNote) => this.updateUnitReceiptNote(unitPaymentPriceCorrectionNote))
            .then((unitPaymentPriceCorrectionNote) => this.updateUnitPaymentOrder(unitPaymentPriceCorrectionNote))
            .then(() => {
                return this.syncItems(id);
            })
    }

    updatePurchaseOrder(unitPaymentPriceCorrectionNote) {
        var realizations = unitPaymentPriceCorrectionNote.items.map((item) => {
            return {
                purchaseOrderId: item.purchaseOrderId,
                productId: item.productId,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                priceTotal: item.priceTotal,
                currency: item.currency,
                unitReceiptNoteNo: item.unitReceiptNoteNo
            }
        })
        realizations = [].concat.apply([], realizations);

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
                        var productId = realization.productId;
                        var poItem = purchaseOrder.items.find(item => item.product._id.toString() === productId.toString());
                        var fulfillment = poItem.fulfillments.find((fulfillment) => realization.unitReceiptNoteNo === fulfillment.unitReceiptNoteNo && unitPaymentPriceCorrectionNote.unitPaymentOrder.no === fulfillment.interNoteNo)

                        if (fulfillment) {
                            var _correction = {};
                            var _qty = 0;

                            if (fulfillment) {
                                if (!fulfillment.correction) {
                                    fulfillment.correction = [];
                                }
                                var correctionQty = 0;
                                if (fulfillment.correction.length > 0) {
                                    var lastQty = fulfillment.correction[fulfillment.correction.length - 1].correctionQuantity;
                                    correctionQty = realization.quantity - lastQty;
                                } else {
                                    correctionQty = fulfillment.unitReceiptNoteDeliveredQuantity - realization.quantity;
                                }

                                _correction.correctionDate = unitPaymentPriceCorrectionNote.date;
                                _correction.correctionNo = unitPaymentPriceCorrectionNote.no;
                                _correction.correctionRemark = `Koreksi ${unitPaymentPriceCorrectionNote.correctionType}`;
                                _correction.correctionQuantity = Number(correctionQty);
                                _correction.correctionPriceTotal = correctionQty * realization.pricePerUnit * realization.currency.rate;

                                fulfillment.correction.push(_correction);
                            }
                        }
                    }
                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(unitPaymentPriceCorrectionNote);
        })
    }

    updateUnitReceiptNote(unitPaymentPriceCorrectionNote) {
        var urnIds = unitPaymentPriceCorrectionNote.unitPaymentOrder.items.map((upoItem) => upoItem.unitReceiptNoteId);
        var realizations = unitPaymentPriceCorrectionNote.items.map((item) => {
            return {
                purchaseOrderId: item.purchaseOrderId,
                productId: item.productId,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                priceTotal: item.priceTotal,
                currency: item.currency,
                unitReceiptNoteNo: item.unitReceiptNoteNo
            }
        })
        realizations = [].concat.apply([], realizations);

        var jobs = [];
        for (var urnId of urnIds) {
            var job = this.unitReceiptNoteManager.getSingleById(urnId)
                .then((unitReceiptNote) => {
                    return Promise.all(unitReceiptNote.items.map((item) => {
                        return this.purchaseOrderManager.getSingleById(item.purchaseOrderId)
                    }))
                        .then((purchaseOrders) => {
                            for (var item of unitReceiptNote.items) {
                                var realization = realizations.find((_realization) => _realization.productId.toString() === item.product._id.toString() && _realization.purchaseOrderId.toString() === item.purchaseOrderId.toString() && _realization.unitReceiptNoteNo === unitReceiptNote.no);
                                if (realization) {
                                    var _correction = {
                                        correctionDate: unitPaymentPriceCorrectionNote.date,
                                        correctionNo: unitPaymentPriceCorrectionNote.no,
                                        correctionQuantity: Number(realization.quantity),
                                        correctionPricePerUnit: Number(realization.pricePerUnit),
                                        correctionPriceTotal: Number(realization.priceTotal),
                                        correctionRemark: `Koreksi ${unitPaymentPriceCorrectionNote.correctionType}`
                                    };
                                    item.correction.push(_correction);
                                }
                                var purchaseOrder = purchaseOrders.find((_purchaseOrder) => _purchaseOrder._id.toString() === item.purchaseOrderId.toString());
                                if (purchaseOrder) {
                                    item.purchaseOrder = purchaseOrder;
                                }
                            }
                            return this.unitReceiptNoteManager.updateCollectionUnitReceiptNote(unitReceiptNote);
                        })
                })
            jobs.push(job);
        }

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(unitPaymentPriceCorrectionNote);
        })
    }

    updateUnitPaymentOrder(unitPaymentPriceCorrectionNote) {
        var unitPaymentOrder = unitPaymentPriceCorrectionNote.unitPaymentOrder;
        var getUnitReceiptNotes = unitPaymentOrder.items.map((unitPaymentOrderItem) => {
            return this.unitReceiptNoteManager.getSingleById(unitPaymentOrderItem.unitReceiptNoteId)
        })
        return this.unitPaymentOrderManager.getSingleByIdOrDefault(unitPaymentOrder._id)
            .then((_unitPaymentOrder) => {
                return Promise.all(getUnitReceiptNotes)
                    .then((unitReceiptNotes) => {
                        for (var unitPaymentOrderItem of _unitPaymentOrder.items) {
                            var _unitReceiptNote = unitReceiptNotes.find((unitReceiptNote) => unitPaymentOrderItem.unitReceiptNoteId.toString() === unitReceiptNote._id.toString())
                            if (_unitReceiptNote) {
                                unitPaymentOrderItem.unitReceiptNote = _unitReceiptNote;
                            }
                        }
                        if (!_unitPaymentOrder.stamp) {
                            _unitPaymentOrder = new UnitPaymentOrder(_unitPaymentOrder);
                        }
                        _unitPaymentOrder.stamp(this.user.username, 'manager');
                        return this.unitPaymentOrderManager.collection.update(_unitPaymentOrder)
                    })
                    .then((results) => {
                        return Promise.resolve(unitPaymentPriceCorrectionNote);
                    })
            })

    }

    syncItems(id) {
        var query = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
        };
        return this.getSingleByQuery(query)
            .then((unitPaymentPriceCorrectionNote) => {
                var realizations = unitPaymentPriceCorrectionNote.items.map((item) => { return item.purchaseOrderId });
                realizations = [].concat.apply([], realizations);

                var _listPO = realizations.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var jobGetPurchaseOrders = _listPO.map((po) => { return this.purchaseOrderManager.getSingleById(po) });

                return Promise.all(jobGetPurchaseOrders)
                    .then((purchaseOrders) => {
                        return this.unitPaymentOrderManager.getSingleById(unitPaymentPriceCorrectionNote.unitPaymentOrderId)
                            .then((unitPaymentOrder) => {
                                unitPaymentPriceCorrectionNote.unitPaymentOrder = unitPaymentOrder;

                                for (var item of unitPaymentPriceCorrectionNote.items) {
                                    var _purchaseOrder = purchaseOrders.find((purchaseOrder) => purchaseOrder._id.toString() === item.purchaseOrderId.toString());
                                    if (_purchaseOrder) {
                                        item.purchaseOrder = _purchaseOrder;
                                    }
                                }
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
                                        // qty = _fulfillment.unitReceiptNoteDeliveredQuantity - _item.quantity;
                                        // priceTotal = qty * _item.pricePerUnit;
                                        priceTotal = _item.quantity * _item.pricePerUnit;
                                        pricePerUnit = _item.pricePerUnit;
                                        _item.pricePerUnit = pricePerUnit;
                                        // _item.quantity = qty;
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