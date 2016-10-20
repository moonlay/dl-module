'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var UnitPaymentPriceCorrectionNote = DLModels.purchasing.UnitPaymentPriceCorrectionNote;
var PurchaseOrderManager = require('./purchase-order-manager');
var BaseManager = require('../base-manager');

module.exports = class UnitPaymentPriceCorrectionNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitPaymentPriceCorrectionNote);
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

            Promise.all([getUnitPaymentPriceCorrectionNote])
                .then(results => {
                    var _module = results[0];
                    var now = new Date();

                    if (!valid.no || valid.no == '')
                        errors["no"] = i18n.__("UnitPaymentPriceCorrectionNote.no.isRequired:%s is required", i18n.__("UnitPaymentPriceCorrectionNote.no._:No"));
                    else if (_module)
                        errors["no"] = i18n.__("UnitPaymentPriceCorrectionNote.no.isExists:%s is already exists", i18n.__("UnitPaymentPriceCorrectionNote.no._:No"));

                    if (!valid.unitPaymentOrderId)
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

                    valid.unitPaymentOrderId = new ObjectId(valid.unitPaymentOrder._id);
                    valid.unitPaymentOrder._id = new ObjectId(valid.unitPaymentOrder._id);
                    valid.unitPaymentOrder.unitId = new ObjectId(valid.unitPaymentOrder.unit._id);
                    valid.unitPaymentOrder.unit._id = new ObjectId(valid.unitPaymentOrder.unit._id);
                    valid.unitPaymentOrder.supplierId = new ObjectId(valid.unitPaymentOrder.supplier._id);
                    valid.unitPaymentOrder.supplier._id = new ObjectId(valid.unitPaymentOrder.supplier._id);

                    for (var unitPaymentOrderItem of valid.unitPaymentOrder.items) {
                        unitPaymentOrderItem.productId = new ObjectId(unitPaymentOrderItem.product._id);
                        unitPaymentOrderItem.product._id = new ObjectId(unitPaymentOrderItem.product._id);
                        unitPaymentOrderItem.unitReceiptNoteId = new ObjectId(unitPaymentOrderItem.unitReceiptNote._id);
                        unitPaymentOrderItem.unitReceiptNote._id = new ObjectId(unitPaymentOrderItem.unitReceiptNote._id);

                        unitPaymentOrderItem.unitReceiptNote.unitId = new ObjectId(unitPaymentOrderItem.unitReceiptNote.unit._id);
                        unitPaymentOrderItem.unitReceiptNote.supplierId = new ObjectId(unitPaymentOrderItem.unitReceiptNote.supplier._id);
                        unitPaymentOrderItem.unitReceiptNote.deliveryOrderId = new ObjectId(unitPaymentOrderItem.unitReceiptNote.deliveryOrder._id);
                        unitPaymentOrderItem.unitReceiptNote.deliveryOrder.supplierId = new ObjectId(unitPaymentOrderItem.unitReceiptNote.deliveryOrder.supplier._id);
                        for (var doItem of unitPaymentOrderItem.unitReceiptNote.deliveryOrder.items) {
                            doItem.purchaseOrderExternalId = new ObjectId(doItem.purchaseOrderExternal._id);
                            for (var fulfillment of doItem.fulfillments) {
                                fulfillment.purchaseOrderId = new ObjectId(fulfillment.purchaseOrder._id);
                                fulfillment.purchaseOrder._id = new ObjectId(fulfillment.purchaseOrder._id);
                                fulfillment.purchaseOrder.unitId = new ObjectId(fulfillment.purchaseOrder.unit._id);
                                fulfillment.purchaseOrder.unit._id = new ObjectId(fulfillment.purchaseOrder.unit._id);
                                fulfillment.purchaseOrder.categoryId = new ObjectId(fulfillment.purchaseOrder.category._id);
                                fulfillment.purchaseOrder.category._id = new ObjectId(fulfillment.purchaseOrder.category._id);
                                fulfillment.productId = new ObjectId(fulfillment.productId);
                            }
                        }

                        for (var item of unitPaymentOrderItem.unitReceiptNote.items) {
                            item.product._id = new ObjectId(item.product._id);
                            item.purchaseOrderId = new ObjectId(item.purchaseOrder._id);
                            item.purchaseOrder._id = new ObjectId(item.purchaseOrder._id);
                            item.purchaseOrder.unitId = new ObjectId(item.purchaseOrder.unit._id);
                            item.purchaseOrder.unit._id = new ObjectId(item.purchaseOrder.unit._id);
                            item.purchaseOrder.categoryId = new ObjectId(item.purchaseOrder.category._id);
                            item.purchaseOrder.category._id = new ObjectId(item.purchaseOrder.category._id);
                            for (var poItem of item.purchaseOrder.items) {
                                poItem.product._id = new ObjectId(poItem.product.uom._id);
                                poItem.product.uom._id = new ObjectId(poItem.product.uom._id);
                                poItem.defaultUom._id = new ObjectId(poItem.product.uom._id);
                            }
                        }

                    }

                    for (var item of valid.items) {
                        item.product._id = new ObjectId(item.product._id);
                        item.product.uom._id = new ObjectId(item.product.uom._id);
                        item.uom._id = new ObjectId(item.uom._id);
                        item.purchaseOrderExternalId = new ObjectId(item.purchaseOrderExternal._id);
                        item.purchaseOrderExternal._id = new ObjectId(item.purchaseOrderExternal._id);
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
        query = { '$and': [deletedFilter, paging.filter || {}, keywordFilter] }
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