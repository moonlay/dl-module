'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var UnitReceiptNote = DLModels.purchasing.UnitReceiptNote;
var PurchaseOrderManager = require('./purchase-order-manager');
var BaseManager = require('../base-manager');

module.exports = class UnitReceiptNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitReceiptNote);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
    }

    _validate(unitReceiptNote) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = unitReceiptNote;

            var getUnitReceiptNotePromise = this.collection.singleOrDefault({
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

            Promise.all([getUnitReceiptNotePromise])
                .then(results => {
                    var _module = results[0];
                    var now = new Date();

                    if (!valid.no || valid.no == '')
                        errors["no"] = i18n.__("UnitReceiptNote.no.isRequired:%s is required", i18n.__("UnitReceiptNote.no._:No")); //No. bon unit tidak boleh kosong";
                    else if (_module)
                        errors["no"] = i18n.__("UnitReceiptNote.no.isExists:%s is already exists", i18n.__("UnitReceiptNote.no._:No")); //"No. bon unit sudah terdaftar";

                    if (!valid.unitId)
                        errors["unit"] = i18n.__("UnitReceiptNote.unit.isRequired:%s is required", i18n.__("UnitReceiptNote.unit._:Unit")); //"Unit tidak boleh kosong";
                    else if (valid.unit) {
                        if (!valid.unit._id)
                            errors["unit"] = i18n.__("UnitReceiptNote.unit.isRequired:%s is required", i18n.__("UnitReceiptNote.unit._:Unit")); //"Unit tidak boleh kosong";
                    }
                    else if (!valid.unit)
                        errors["unit"] = i18n.__("UnitReceiptNote.unit.isRequired:%s is required", i18n.__("UnitReceiptNote.unit._:Unit")); //"Unit tidak boleh kosong";

                    if (!valid.supplierId)
                        errors["supplier"] = i18n.__("UnitReceiptNote.supplier.isRequired:%s name is required", i18n.__("UnitReceiptNote.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    else if (valid.supplier) {
                        if (!valid.supplier._id)
                            errors["supplier"] = i18n.__("UnitReceiptNote.supplier.isRequired:%s name is required", i18n.__("UnitReceiptNote.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    }
                    else if (!valid.supplier)
                        errors["supplier"] = i18n.__("UnitReceiptNote.supplier.isRequired:%s name is required", i18n.__("UnitReceiptNote.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";

                    if (!valid.deliveryOrderId)
                        errors["deliveryOrder"] = i18n.__("UnitReceiptNote.deliveryOrder.isRequired:%s is required", i18n.__("UnitReceiptNote.deliveryOrder._:Delivery Order No.")); //"No. surat jalan tidak boleh kosong";
                    else if (valid.deliveryOrder) {
                        if (!valid.deliveryOrder._id)
                            errors["deliveryOrder"] = i18n.__("UnitReceiptNote.deliveryOrder.isRequired:%s is required", i18n.__("UnitReceiptNote.deliveryOrder._:Delivery Order No")); //"No. surat jalan tidak boleh kosong";
                    }
                    else if (!valid.deliveryOrder)
                        errors["deliveryOrder"] = i18n.__("UnitReceiptNote.deliveryOrder.isRequired:%s is required", i18n.__("UnitReceiptNote.deliveryOrder._:Delivery Order No")); //"No. surat jalan tidak boleh kosong";

                    if (valid.items) {
                        if (valid.items.length <= 0) {
                            errors["items"] = i18n.__("UnitReceiptNote.items.isRequired:%s is required", i18n.__("UnitReceiptNote.items._:Item")); //"Harus ada minimal 1 barang";
                        }
                        else {
                            var itemErrors = [];
                            for (var item of valid.items) {
                                var itemError = {};
                                if (item.deliveredQuantity <= 0)
                                    itemError["deliveredQuantity"] = i18n.__("UnitReceiptNote.items.deliveredQuantity.isRequired:%s is required", i18n.__("UnitReceiptNote.items.deliveredQuantity._:Delivered Quantity")); //Jumlah barang tidak boleh kosong";
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
                        errors["items"] = i18n.__("UnitReceiptNote.items.isRequired:%s is required", i18n.__("UnitReceiptNote.items._:Item")); //"Harus ada minimal 1 barang";
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.unitId = new ObjectId(valid.unitId);
                    valid.supplierId = new ObjectId(valid.supplierId);
                    valid.deliveryOrderId = new ObjectId(valid.deliveryOrderId);
                    valid.deliveryOrder.supplierId = new ObjectId(valid.deliveryOrder.supplierId);
                    for (var doItem of valid.deliveryOrder.items) {
                        doItem.purchaseOrderExternalId = new ObjectId(doItem.purchaseOrderExternalId);
                        for (var fulfillment of doItem.fulfillments) {
                            fulfillment.purchaseOrderId = new ObjectId(fulfillment.purchaseOrderId);
                            fulfillment.purchaseOrder._id = new ObjectId(fulfillment.purchaseOrder._id);
                            fulfillment.purchaseOrder.unitId = new ObjectId(fulfillment.purchaseOrder.unit._id);
                            fulfillment.purchaseOrder.unit._id = new ObjectId(fulfillment.purchaseOrder.unit._id);
                            fulfillment.purchaseOrder.categoryId = new ObjectId(fulfillment.purchaseOrder.category._id);
                            fulfillment.purchaseOrder.category._id = new ObjectId(fulfillment.purchaseOrder.category._id);
                            fulfillment.productId = new ObjectId(fulfillment.productId);
                        }
                    }

                    for (var item of valid.items){
                        item.product._id = new ObjectId(item.product._id);
                        item.purchaseOrderId = new ObjectId(item.purchaseOrderId);
                        item.purchaseOrder._id = new ObjectId(item.purchaseOrder._id);
                        item.purchaseOrder.unitId = new ObjectId(item.purchaseOrder.unit._id);
                        item.purchaseOrder.unit._id = new ObjectId(item.purchaseOrder.unit._id);
                        item.purchaseOrder.categoryId = new ObjectId(item.purchaseOrder.category._id);
                        item.purchaseOrder.category._id = new ObjectId(item.purchaseOrder.category._id);
                        for(var poItem of item.purchaseOrder.items){
                            poItem.product._id = new ObjectId(poItem.product.uom._id);
                            poItem.product.uom._id = new ObjectId(poItem.product.uom._id);
                            poItem.defaultUom._id = new ObjectId(poItem.product.uom._id);
                        }
                    }

                    if (!valid.stamp)
                        valid = new UnitReceiptNote(valid);

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

            var filterDeliveryOrder = {
                "deliveryOrder.no": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplierName, filterUnitDivision, filterUnitSubDivision, filterDeliveryOrder]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    create(unitReceiptNote) {
        return new Promise((resolve, reject) => {
            var tasks = [];
            var tasksPoExternal = [];
            var getPurchaseOrderById = [];
            this._validate(unitReceiptNote)
                .then(validUnitReceiptNote => {
                    validUnitReceiptNote.unitId = new ObjectId(validUnitReceiptNote.unitId);
                    validUnitReceiptNote.supplierId = new ObjectId(validUnitReceiptNote.supplierId);
                    validUnitReceiptNote.deliveryOrderId = new ObjectId(validUnitReceiptNote.deliveryOrderId);
                    validUnitReceiptNote.date = validUnitReceiptNote._createdDate;
                    this.collection.insert(validUnitReceiptNote)
                        .then(id => {
                            //update PO Internal
                            for (var doItem of validUnitReceiptNote.deliveryOrder.items) {
                                for (var fulfillment of doItem.fulfillments)
                                    getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(fulfillment.purchaseOrder._id));
                            }
                            Promise.all(getPurchaseOrderById)
                                .then(results => {
                                    for (var result of results) {
                                        var purchaseOrder = result;
                                        for (var poItem of purchaseOrder.items) {
                                            for (var unitReceiptNoteItem of validUnitReceiptNote.items) {
                                                if (validUnitReceiptNote.unitId.equals(purchaseOrder.unitId)) {
                                                    if (unitReceiptNoteItem.product._id.equals(poItem.product._id)) {
                                                        for (var fulfillment of poItem.fulfillments) {
                                                            var fulfillmentNo = fulfillment.deliveryOderNo || '';
                                                            var deliveryOrderNo = validUnitReceiptNote.deliveryOrder.no || '';

                                                            if (fulfillmentNo == deliveryOrderNo) {
                                                                fulfillment.unitReceiptNoteNo = validUnitReceiptNote.no;
                                                                fulfillment.unitReceiptNoteDate = validUnitReceiptNote.date;
                                                                fulfillment.unitReceiptNoteDeliveredQuantity = unitReceiptNoteItem.deliveredQuantity;
                                                                fulfillment.unitReceiptDeliveredUom = unitReceiptNoteItem.deliveredUom;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        tasks.push(this.purchaseOrderManager.update(purchaseOrder));
                                    }

                                    Promise.all(tasks)
                                        .then(results => {
                                            resolve(id);
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
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
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

    getUnitReceiptNotes(_no, _unitId, _categoryId, _supplierId, _dateFrom, _dateTo) {
        return new Promise((resolve, reject) => {
            var query = Object.assign({});

            var deleted = { _deleted: false };

            if (_no != "undefined" && _no != "") {
                var no = { no: _no };
                Object.assign(query, no);
            }
            if (_unitId != "undefined" && _unitId != "") {
                var unitId = { unitId: new ObjectId(_unitId) };
                Object.assign(query, unitId);
            }
            if (_categoryId != "undefined" && _categoryId != "") {
                var categoryId = {
                    "items": {
                        $elemMatch: {
                            "purchaseOrder.categoryId": new ObjectId(_categoryId)
                        }
                    }
                };
                Object.assign(query, categoryId);
            }
            if (_supplierId != "undefined" && _supplierId != "") {
                var supplierId = { supplierId: new ObjectId(_supplierId) };
                Object.assign(query, supplierId);
            }
            if (_dateFrom != "undefined" && _dateFrom != "null" && _dateFrom != "" && _dateTo != "undefined" && _dateTo != "null" && _dateTo != "") {
                var date = {
                    date: {
                        $gte: _dateFrom,
                        $lte: _dateTo
                    }
                };
                Object.assign(query, date);
            }
            Object.assign(query, deleted);

            this.collection
                .where(query)
                .execute()
                .then(result => {
                    resolve(result.data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

}