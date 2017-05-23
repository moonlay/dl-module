"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../../utils/code-generator");

var PackingManager = require('../../production/finishing-printing/packing-manager');
var ProductManager = require('../../master/product-manager');
var StorageManager = require('../../master/storage-manager');
var InventoryDocumentManager = require('../inventory-document-manager');

var Models = require("dl-models");
var Map = Models.map;
var PackingReceiptModel = Models.inventory.finishingPrinting.FPPackingReceipt;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class FPPackingReceiptManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.inventory.finishingPrinting.collection.FPPackingReceipt);

        this.packingManager = new PackingManager(db, user);
        this.productManager = new ProductManager(db, user);
        this.storageManager = new StorageManager(db, user);
        this.inventoryDocumentManager = new InventoryDocumentManager(db, user);
    }

    _getQuery(paging) {
        var _default = {
            _deleted: false
        },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var packingCodeFilter = {
                "packingCode": {
                    "$regex": regex
                }
            };
            var dateFilter = {
                "date": {
                    "$regex": regex
                }
            };
            var buyerFilter = {
                "buyer": {
                    "$regex": regex
                }
            };
            var productionOrderNoFilter = {
                "productionOrderNo": {
                    "$regex": regex
                }
            };
            var colorNameFilter = {
                "colorName": {
                    "$regex": regex
                }
            };
            var constructionFilter = {
                "construction": {
                    "$regex": regex
                }
            };
            var createdByFilter = {
                "_createdBy": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [packingCodeFilter, dateFilter, buyerFilter, productionOrderNoFilter, colorNameFilter, constructionFilter, createdByFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _validate(packingReceipt) {
        var errors = {};
        var valid = packingReceipt;

        var getDbPackingReceipt = this.collection.singleOrDefault({
            _id: new ObjectId(valid._id)
        });
        var getDuplicatePackingReceipt = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });
        var getPacking = valid.packingId && ObjectId.isValid(valid.packingId) ? this.packingManager.getSingleByIdOrDefault(valid.packingId) : Promise.resolve(null);

        var getStorage = valid.items ? this.storageManager.collection.find({ name: "Gudang Jadi Finishing Printing" }).toArray() : Promise.resolve([]);

        valid.items = valid.items instanceof Array ? valid.items : [];
        var products = valid.items.map((item) => item.product ? item.product : null);
        var getProducts = products.length > 0 ? this.productManager.collection.find({ name: { "$in": products } }).toArray() : Promise.resolve([]);

        return Promise.all([getDbPackingReceipt, getDuplicatePackingReceipt, getPacking, getStorage, getProducts])
            .then((results) => {
                var _dbPackingReceipt = results[0];
                var _duplicatePackingReceipt = results[1];
                var _packing = results[2];
                var _storages = results[3];
                var _products = results[4];

                if (_dbPackingReceipt)
                    valid.code = _dbPackingReceipt.code; // prevent code changes.

                if (_duplicatePackingReceipt)
                    errors["code"] = i18n.__("PackingReceipt.code.isExist: %s is exist", i18n.__("PackingReceipt.code._:Code"));

                if (!valid.packingId || valid.packingId === '')
                    errors["packingId"] = i18n.__("PackingReceipt.packingId.isRequired:%s is required", i18n.__("PackingReceipt.packingId._:Packing")); //"Grade harus diisi";   
                else if (!_packing)
                    errors["packingId"] = i18n.__("PackingReceipt.packingId: %s not found", i18n.__("PackingReceipt.KanbanId._:Packing"));

                if (!valid.date)
                    errors["date"] = i18n.__("PackingReceipt.date.isRequired:%s is required", i18n.__("PackingReceipt.date._:Date")); //"Grade harus diisi";

                if (!valid.accepted && !valid.declined) {
                    errors["accepted"] = i18n.__("PackingReceipt.accepted.isRequired:%s is required", i18n.__("PackingReceipt.accepted._:Accepted")); //"Grade harus diisi";   
                    errors["declined"] = i18n.__("PackingReceipt.declined.isRequired:%s is required", i18n.__("PackingReceipt.declined._:Declined")); //"Grade harus diisi";   
                }

                if (valid.items.length > 0) {
                    var itemErrors = [];
                    for (var i = 0; i < _packing.items.length; i++) {
                        var itemError = {};
                        if (valid.items[i].quantity !== _packing.items[i].quantity && (!valid.items[i].notes || valid.items[i].notes === "")) {
                            itemError["notes"] = i18n.__("PackingReceipt.items.notes.isRequired:%s is required", i18n.__("PackingReceipt.items.notes._:Notes")); //"Note harus diisi"; 
                        }
                        itemErrors.push(itemError);
                    }

                    for (var itemError of itemErrors) {
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            errors.items = itemErrors;
                            break;
                        }
                    }
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }


                valid.packingId = _packing._id;
                valid.packingCode = _packing.code;

                //Inventory Document Validation
                valid.storageId = _storages.length > 0 ? new ObjectId(_storages[0]._id) : null;
                valid.referenceType = "Penerimaan Packing Gudang Jadi";
                valid.type = "IN";

                for (var i = 0; i < valid.items.length; i++) {
                    valid.items[i].uomId = _products[i].uomId;
                    valid.items[i].productId = _products[i]._id;
                }

                valid.buyer = _packing.buyer;
                valid.productionOrderNo = _packing.productionOrderNo;
                valid.colorName = _packing.colorName;
                valid.construction = _packing.construction;
                valid.packingUom = _packing.packingUom;

                if (!valid.stamp) {
                    valid = new PackingReceiptModel(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);


            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.inventory.finishingPrinting.collection.PackingReceipt}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var codeIndex = {
            name: `ix_${Map.inventory.finishingPrinting.collection.PackingReceipt}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((packingReceipt) => {
                var packingReceiptId = id;
                var packingReceipt = packingReceipt;
                return this.packingManager.getSingleById(packingReceipt.packingId)
                    .then((packing) => {
                        packing.accepted = true;
                        return this.packingManager.update(packing)
                            .then((id) => {
                                packingReceipt.referenceNo = `RFNO-${packingReceipt.code}`;
                                return this.inventoryDocumentManager.create(packingReceipt)
                                    .then((inventoryDocument) => Promise.resolve(packingReceiptId))
                            })
                    })
            })
    }
};
