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

module.exports = class UnitPaymentPriceCorrectionNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitPaymentCorrectionNote);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
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

                    for (var _item of unitPaymentPriceCorrectionNote.items) {
                        for (var _poItem of _item.purchaseOrder.items) {
                            if (_poItem.product._id.toString() === _item.product._id.toString()) {
                                for (var _unitReceiptNote of unitPaymentPriceCorrectionNote.unitPaymentOrder.items) {
                                    for (var _unitReceiptNoteItem of _unitReceiptNote.unitReceiptNote.items) {
                                        if (_poItem.product._id.toString() === _unitReceiptNoteItem.product._id.toString() && _item.purchaseOrder._id.toString() === _unitReceiptNoteItem.purchaseOrder._id.toString()) {
                                            for (var _fulfillment of _poItem.fulfillments) {
                                                var pricePerUnit = 0, priceTotal = 0;
                                                if (_item.unitReceiptNoteNo === _fulfillment.unitReceiptNoteNo && unitPaymentPriceCorrectionNote.unitPaymentOrder.no === _fulfillment.interNoteNo) {
                                                    if (_unitReceiptNoteItem.correction.length > 0) {
                                                        if (unitPaymentPriceCorrectionNote.correctionType === "Harga Satuan") {
                                                            pricePerUnit = _unitReceiptNoteItem.correction[_unitReceiptNoteItem.correction.length - 1].correctionPricePerUnit - _item.pricePerUnit;
                                                            priceTotal = pricePerUnit * _item.quantity;
                                                        }
                                                        else if (unitPaymentPriceCorrectionNote.correctionType === "Harga Total") {
                                                            priceTotal = (_item.quantity * _unitReceiptNoteItem.correction[_unitReceiptNoteItem.correction.length - 1].correctionPricePerUnit) - (_item.priceTotal)
                                                        }
                                                    } else {
                                                        if (unitPaymentPriceCorrectionNote.correctionType === "Harga Satuan") {
                                                            pricePerUnit = _poItem.pricePerDealUnit - _item.pricePerUnit;
                                                            priceTotal = pricePerUnit * _item.quantity;
                                                        }
                                                        else if (unitPaymentPriceCorrectionNote.correctionType === "Harga Total") {
                                                            priceTotal = (_item.quantity * _poItem.pricePerDealUnit) - (_item.priceTotal)
                                                        }
                                                    }

                                                    _item.pricePerUnit = pricePerUnit;
                                                    _item.priceTotal = priceTotal;
                                                    break;
                                                }
                                            }
                                            break;
                                        }
                                    }
                                }
                                break;
                            }
                        }
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

    create(unitPaymentPriceCorrectionNote) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(unitPaymentPriceCorrectionNote)
                        .then(validData => {
                            var tasks = [];
                            var getPurchaseOrderById = [];
                            validData.no = generateCode();
                            validData._createdDate = new Date();
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
                                        for (var unitPaymentPriceCorrectionNoteItem of validData.items) {
                                            if (unitPaymentPriceCorrectionNoteItem.purchaseOrder._id.equals(_purchaseOrder._id)) {
                                                for (var _poItem of _purchaseOrder.items) {
                                                    if (unitPaymentPriceCorrectionNoteItem.product._id.equals(_poItem.product._id)) {
                                                        for (var fulfillmentPoItem of _poItem.fulfillments) {
                                                            var _unitPaymentOrderNo = fulfillmentPoItem.interNoteNo || '';
                                                            var _unitReceiptNoteNo = fulfillmentPoItem.unitReceiptNoteNo || '';

                                                            if (unitPaymentPriceCorrectionNoteItem.unitReceiptNoteNo === _unitReceiptNoteNo && validData.unitPaymentOrder.no === _unitPaymentOrderNo) {
                                                                if (!fulfillmentPoItem.correction)
                                                                    fulfillmentPoItem.correction = [];
                                                                var _correction = {};
                                                                _correction.correctionDate = validData.date;
                                                                _correction.correctionNo = validData.no;
                                                                _correction.correctionQuantity = unitPaymentPriceCorrectionNoteItem.quantity;
                                                                _correction.correctionPriceTotal = (unitPaymentPriceCorrectionNoteItem.priceTotal * unitPaymentPriceCorrectionNoteItem.currency.rate) - (unitPaymentPriceCorrectionNoteItem.quantity * _poItem.pricePerDealUnit * unitPaymentPriceCorrectionNoteItem.currency.rate);
                                                                _correction.correctionRemark = `Koreksi ${validData.correctionType}`;
                                                                fulfillmentPoItem.correction.push(_correction);
                                                                break;
                                                            }
                                                        }
                                                        break;
                                                    }
                                                }
                                                unitPaymentPriceCorrectionNoteItem.purchaseOrder = _purchaseOrder;
                                                unitPaymentPriceCorrectionNoteItem.purchaseOrderId = new ObjectId(_purchaseOrder._id);
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
                                                    if (_item.unitReceiptNoteNo == _unitReceiptNote.unitReceiptNote.no) {
                                                        for (var _unitReceiptNoteItem of _unitReceiptNote.unitReceiptNote.items) {
                                                            if (_item.purchaseOrderId.toString() === _unitReceiptNoteItem.purchaseOrderId.toString() && _item.product._id.toString() === _unitReceiptNoteItem.product._id.toString()) {
                                                                var _correction = {
                                                                    correctionDate: validData.date,
                                                                    correctionNo: validData.no,
                                                                    correctionQuantity: _item.quantity,
                                                                    correctionPricePerUnit: _item.pricePerUnit,
                                                                    correctionPriceTotal: _item.priceTotal,
                                                                    correctionRemark: `Koreksi ${validData.correctionType}`
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
        return new Promise((resolve, reject) => {
            var sorting = {
                "date": -1,
                "no": 1
            };
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

            this.collection.where(query).select(_select).order(sorting).execute()
                .then((results) => {
                    resolve(results.data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
}