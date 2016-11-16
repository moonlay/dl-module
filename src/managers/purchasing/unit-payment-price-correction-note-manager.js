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
var BaseManager = require('../base-manager');

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

            var getUnitPaymentOrder = valid.unitPaymentOrder ? this.unitPaymentOrderManager.getSingleByIdOrDefault(valid.unitPaymentOrder._id) : Promise.resolve(null);

            Promise.all([getUnitPaymentPriceCorrectionNote, getUnitPaymentOrder])
                .then(results => {
                    var _unitPaymentPriceCorrectionNote = results[0];
                    var _unitPaymentOrder = results[1];
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

                    if (!valid.invoiceCorrectionNo || valid.invoiceCorrectionNo == '')
                        errors["invoiceCorrectionNo"] = i18n.__("UnitPaymentPriceCorrectionNote.invoiceCorrectionNo.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.invoiceCorrectionNo._:Invoice Correction No"));

                    if (!valid.invoiceCorrectionDate || valid.invoiceCorrectionDate == '')
                        errors["invoiceCorrectionDate"] = i18n.__("UnitPaymentPriceCorrectionNote.invoiceCorrectionDate.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.invoiceCorrectionDate._:Invoice Correction Date"));

                    if (valid.items) {
                        if (valid.items.length > 0) {
                            var itemErrors = [];
                            for (var item of valid.items) {
                                var itemError = {};
                                if (item.pricePerUnit <= 0)
                                    itemError["pricePerUnit"] = i18n.__("UnitPaymentPriceCorrectionNote.items.pricePerUnit.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.items.pricePerUnit._:Price Per Unit"));

                                if (item.priceTotal <= 0)
                                    itemError["priceTotal"] = i18n.__("UnitPaymentPriceCorrectionNote.items.priceTotal.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.items.priceTotal._:Total Price"));

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
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.unitPaymentOrderId = _unitPaymentOrder._id;
                    valid.unitPaymentOrder = _unitPaymentOrder;

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
                                    item.quantity = _unitReceiptNoteItem.deliveredQuantity;
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

    _createIndexes() {
        var createdDateIndex = {
            name: `ix_${map.master.collection.PurchaseOrder}__createdDate`,
            key: {
                _createdDate: -1
            }
        }
        var poNoIndex = {
            name: `ix_${map.master.collection.PurchaseOrder}_no`,
            key: {
                no: -1
            },
            unique: true
        }

        return this.collection.createIndexes([createdDateIndex, poNoIndex]);
    }

    pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(unitReceiptNote => {
                    var getDefinition = require('../../pdf/definitions/unit-payment-correction-note');
                    var definition = getDefinition(unitReceiptNote);

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

    generateNo(unit, category) {
        var now = new Date();
        var stamp = now / 1000 | 0;
        var code = stamp.toString();
        var locale = 'id-ID';
        var moment = require('moment');
        moment.locale(locale);
        var no = `NDO${unit.toUpperCase()}${category.toUpperCase()}${moment(new Date()).format("YYMM")}${code}`;
        return no;
    }

    create(unitPaymentPriceCorrectionNote) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(unitPaymentPriceCorrectionNote)
                        .then(validData => {
                            var tasks = [];
                            var getPurchaseOrderById = [];
                            validData.no = this.generateNo(validData.unitPaymentOrder.division.code, validData.unitPaymentOrder.category.code);
                            //Update PO Internal
                            var poId = new ObjectId();
                            for (var _item of validData.items) {
                                if (!poId.equals(_item.purchaseOrder._id)) {
                                    poId = new ObjectId(_item.purchaseOrder._id);
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

                                                            if (unitPaymentPriceCorrectionNoteItem.unitReceiptNoteNo == _unitReceiptNoteNo && validData.unitPaymentOrder.no == _unitPaymentOrderNo) {
                                                                fulfillmentPoItem.priceCorrectionDate = validData.date;
                                                                fulfillmentPoItem.priceCorrectionNo = validData.no;
                                                                fulfillmentPoItem.priceCorrectionPriceTotal = (unitPaymentPriceCorrectionNoteItem.quantity * _poItem.pricePerDealUnit * unitPaymentPriceCorrectionNoteItem.currency.rate) - (unitPaymentPriceCorrectionNoteItem.priceTotal * unitPaymentPriceCorrectionNoteItem.currency.rate);
                                                                fulfillmentPoItem.priceCorrectionRemark = validData.remark;
                                                                break;
                                                            }
                                                        }
                                                        unitPaymentPriceCorrectionNoteItem.purchaseOrder = _purchaseOrder;
                                                        unitPaymentPriceCorrectionNoteItem.purchaseOrderId = new ObjectId(_purchaseOrder._id);
                                                    }
                                                }
                                            }
                                        }
                                        tasks.push(this.purchaseOrderManager.update(_purchaseOrder));
                                    }
                                    Promise.all(tasks)
                                        .then(results => {
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
            name: `ix_${map.purchasing.collection.UnitPaymentPriceCorrectionNote}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.purchasing.collection.UnitPaymentPriceCorrectionNote}_no`,
            key: {
                no: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    update(unitPaymentPriceCorrectionNote) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(unitPaymentPriceCorrectionNote)
                        .then(validData => {
                            var getPurchaseOrderById = [];
                            var tasks = [];
                            //Update PO Internal
                            var poId = new ObjectId();
                            for (var _item of validData.items) {
                                if (!poId.equals(_item.purchaseOrder._id)) {
                                    poId = new ObjectId(_item.purchaseOrder._id);
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

                                                            if (unitPaymentPriceCorrectionNoteItem.unitReceiptNoteNo == _unitReceiptNoteNo && validData.unitPaymentOrder.no == _unitPaymentOrderNo) {
                                                                fulfillmentPoItem.priceCorrectionDate = validData.date;
                                                                fulfillmentPoItem.priceCorrectionNo = validData.no;
                                                                fulfillmentPoItem.priceCorrectionPriceTotal = (unitPaymentPriceCorrectionNoteItem.quantity * _poItem.pricePerDealUnit * unitPaymentPriceCorrectionNoteItem.currency.rate) - (unitPaymentPriceCorrectionNoteItem.priceTotal * unitPaymentPriceCorrectionNoteItem.currency.rate);
                                                                fulfillmentPoItem.priceCorrectionRemark = validData.remark;
                                                                break;
                                                            }
                                                        }
                                                        unitPaymentPriceCorrectionNoteItem.purchaseOrder = _purchaseOrder;
                                                        unitPaymentPriceCorrectionNoteItem.purchaseOrderId = new ObjectId(_purchaseOrder._id);
                                                    }
                                                }
                                            }
                                        }
                                        tasks.push(this.purchaseOrderManager.update(_purchaseOrder));
                                    }
                                    Promise.all(tasks)
                                        .then(results => {
                                            this.collection.update(validData)
                                                .then(id => {
                                                    resolve(id);
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

    delete(unitPaymentPriceCorrectionNote) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(unitPaymentPriceCorrectionNote)
                        .then(validData => {
                            var tasks = [];
                            var getPurchaseOrderById = [];
                            validData._deleted = true;
                            //Update PO Internal
                            var poId = new ObjectId();
                            for (var _item of validData.items) {
                                if (!poId.equals(_item.purchaseOrder._id)) {
                                    poId = new ObjectId(_item.purchaseOrder._id);
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

                                                            if (unitPaymentPriceCorrectionNoteItem.unitReceiptNoteNo == _unitReceiptNoteNo && validData.unitPaymentOrder.no == _unitPaymentOrderNo) {
                                                                delete fulfillmentPoItem.priceCorrectionDate;
                                                                delete fulfillmentPoItem.priceCorrectionNo;
                                                                delete fulfillmentPoItem.priceCorrectionPriceTotal;
                                                                delete fulfillmentPoItem.priceCorrectionRemark;
                                                                break;
                                                            }
                                                        }
                                                        unitPaymentPriceCorrectionNoteItem.purchaseOrder = _purchaseOrder;
                                                        unitPaymentPriceCorrectionNoteItem.purchaseOrderId = new ObjectId(_purchaseOrder._id);
                                                    }
                                                }
                                            }
                                        }
                                        tasks.push(this.purchaseOrderManager.update(_purchaseOrder));
                                    }
                                    Promise.all(tasks)
                                        .then(results => {
                                            this.collection.update(validData)
                                                .then(id => {
                                                    resolve(id);
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

    pdfReturNote(id) {
        return new Promise((resolve, reject) => {
            this.getSingleById(id)
                .then(unitReceiptNote => {
                    var getDefinition = require('../../pdf/definitions/unit-payment-correction-retur-note');
                    var definition = getDefinition(unitReceiptNote);

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
