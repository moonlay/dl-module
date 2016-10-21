'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var UnitPaymentPriceCorrectionNote = DLModels.purchasing.UnitPaymentPriceCorrectionNote;
var UnitPaymentOrderManager = require('./unit-payment-order-manager');
var BaseManager = require('../base-manager');

module.exports = class UnitPaymentPriceCorrectionNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitPaymentPriceCorrectionNote);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
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

            var getUnitPaymentOrder = this.unitPaymentOrderManager.getSingleById(valid.unitPaymentOrder._id);
            
            Promise.all([getUnitPaymentPriceCorrectionNote,getUnitPaymentOrder])
                .then(results => {
                    var _unitPaymentPriceCorrectionNote = results[0];
                    var _unitPaymentOrder = results[1];
                    var now = new Date();

                    if (!valid.no || valid.no == '')
                        errors["no"] = i18n.__("UnitPaymentPriceCorrectionNote.no.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.no._:No"));
                    else if (_unitPaymentPriceCorrectionNote)
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
                        if (valid.items.length <= 0) {
                            errors["items"] = i18n.__("UnitPaymentPriceCorrectionNote.items.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.items._:Item"));
                        }
                        else {
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
                        for (var _unitPaymentOrderItem of _unitPaymentOrder.items){
                            for(var unitReceiptNoteItem of _unitPaymentOrderItem.unitReceiptNote.items) {
                                    var _purchaseOrderExternalId = new ObjectId(item.purchaseOrderExternalId);
                                    var _productId = new ObjectId(item.productId);

                                    if (_purchaseOrderExternalId.equals(unitReceiptNoteItem.purchaseOrder.purchaseOrderExternalId) && _productId.equals(unitReceiptNoteItem.product._id)) {
                                        item.purchaseOrderExternalId = unitReceiptNoteItem.purchaseOrder.purchaseOrderExternalId;
                                        item.purchaseOrderExternal = unitReceiptNoteItem.purchaseOrder.purchaseOrderExternal;
                                        item.purchaseRequestId = unitReceiptNoteItem.purchaseOrder.purchaseRequestId;
                                        item.purchaseRequest = unitReceiptNoteItem.purchaseOrder.purchaseRequest;
                                        item.productId = unitReceiptNoteItem.product._id;
                                        item.product = unitReceiptNoteItem.product;
                                        item.quantity = unitReceiptNoteItem.deliveredQuantity;
                                        item.uom = unitReceiptNoteItem.deliveredUom;
                                        item.currency = unitReceiptNoteItem.currency;
                                        item.currencyRate = unitReceiptNoteItem.currencyRate;
                                        break;
                                    }
                        }
                    }
                    }

                    if (!valid.stamp)
                        valid = new UnitPaymentPriceCorrectionNote(valid);

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
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
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
                    var getDefinition = require('../../pdf/definitions/unit-receipt-note');
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