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
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');

module.exports = class UnitPaymentQuantityCorrectionNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitPaymentCorrectionNote);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
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
                    valid.priceCorrectionType = "Jumlah";
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
            priceCorrectionType: "Jumlah"
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

    create(unitPaymentQuantityCorrectionNote) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(unitPaymentQuantityCorrectionNote)
                        .then(validData => {
                            var tasks = [];
                            var getPurchaseOrderById = [];
                            validData.no = generateCode();
                            if (validData.unitPaymentOrder.useIncomeTax)
                                validData.returNoteNo = generateCode();
                            //Update PO Internal
                            var poId = new ObjectId();
                            for (var _item of validData.items) {
                                if (!poId.equals(_item.purchaseOrder._id)) {
                                    poId = new ObjectId(_item.purchaseOrder._id);
                                    if (ObjectId.isValid(_item.purchaseOrder._id))
                                        getPurchaseOrderById.push(this.purchaseOrderManager.getSingleByIdOrDefault(_item.purchaseOrder._id));
                                }
                            }

                            Promise.all(getPurchaseOrderById)
                                .then(results => {
                                    for (var _purchaseOrder of results) {
                                        for (var unitPaymentQuantityCorrectionNoteItem of validData.items) {
                                            if (unitPaymentQuantityCorrectionNoteItem.purchaseOrder._id.equals(_purchaseOrder._id)) {
                                                for (var _poItem of _purchaseOrder.items) {
                                                    if (unitPaymentQuantityCorrectionNoteItem.product._id.equals(_poItem.product._id)) {
                                                        for (var fulfillmentPoItem of _poItem.fulfillments) {
                                                            var _unitPaymentOrderNo = fulfillmentPoItem.interNoteNo || '';
                                                            var _unitReceiptNoteNo = fulfillmentPoItem.unitReceiptNoteNo || '';

                                                            if (unitPaymentQuantityCorrectionNoteItem.unitReceiptNoteNo === _unitReceiptNoteNo && validData.unitPaymentOrder.no === _unitPaymentOrderNo) {

                                                                var _correction = {};
                                                                var _qty = 0;
                                                                _correction.correctionDate = validData.date;
                                                                _correction.correctionNo = validData.no;
                                                                _correction.correctionRemark = `Koreksi ${validData.priceCorrectionType}`;

                                                                if (!fulfillmentPoItem.correction) {
                                                                    fulfillmentPoItem.correction = [];
                                                                    _correction.correctionQuantity = fulfillmentPoItem.unitReceiptNoteDeliveredQuantity - unitPaymentQuantityCorrectionNoteItem.quantity;
                                                                } else {
                                                                    var sum = 0;
                                                                    for (var corr of fulfillmentPoItem.correction) {
                                                                        if (corr.correctionRemark == "Koreksi Jumlah")
                                                                            sum += corr.correctionQuantity;
                                                                    }
                                                                    _correction.correctionQuantity = fulfillmentPoItem.unitReceiptNoteDeliveredQuantity - unitPaymentQuantityCorrectionNoteItem.quantity - sum;
                                                                    _qty = unitPaymentQuantityCorrectionNoteItem.quantity + sum - fulfillmentPoItem.unitReceiptNoteDeliveredQuantity;
                                                                }
                                                                _correction.correctionPriceTotal = _qty * unitPaymentQuantityCorrectionNoteItem.pricePerUnit * unitPaymentQuantityCorrectionNoteItem.currency.rate;
                                                                fulfillmentPoItem.correction.push(_correction);
                                                                break;
                                                            }
                                                        }
                                                        break;
                                                    }
                                                }
                                                unitPaymentQuantityCorrectionNoteItem.purchaseOrder = _purchaseOrder;
                                                unitPaymentQuantityCorrectionNoteItem.purchaseOrderId = new ObjectId(_purchaseOrder._id);
                                                break;
                                            }
                                        }
                                        tasks.push(this.purchaseOrderManager.update(_purchaseOrder));
                                    }
                                    Promise.all(tasks)
                                        .then(results => {
                                            var _unitPaymentOrder = validData.unitPaymentOrder;
                                            for (var _item of validData.items) {
                                                for (var _unitReceiptNote of _unitPaymentOrder.items) {
                                                    if (_item.unitReceiptNoteNo === _unitReceiptNote.unitReceiptNote.no) {
                                                        for (var _unitReceiptNoteItem of _unitReceiptNote.unitReceiptNote.items) {
                                                            if (_item.purchaseOrderId.toString() === _unitReceiptNoteItem.purchaseOrderId.toString() && _item.product._id.toString() === _unitReceiptNoteItem.product._id.toString()) {
                                                                var _correction = {
                                                                    correctionDate: validData.date,
                                                                    correctionNo: validData.no,
                                                                    correctionQuantity: _item.quantity,
                                                                    correctionPricePerUnit: _item.pricePerUnit,
                                                                    correctionPriceTotal: _item.priceTotal,
                                                                    correctionRemark: `Koreksi ${validData.priceCorrectionType}`
                                                                };
                                                                _unitReceiptNoteItem.correction.push(_correction);
                                                                break;
                                                            }
                                                        }
                                                        break;
                                                    }
                                                }
                                            }
                                            this.unitPaymentOrderManager.update(_unitPaymentOrder)
                                                .then(_unitPaymentOrderId => {
                                                    validData.unitPaymentOrder = _unitPaymentOrder;
                                                    this.collection.insert(validData)
                                                        .then(id => {
                                                            resolve(id);
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
                                        })
                                })
                                .catch(e => {
                                    reject(e);
                                })

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
            name: `ix_${map.purchasing.collection.UnitPaymentCorrectionNote}__updatedDate`,
            key: {
                _updatedDate: -1
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
