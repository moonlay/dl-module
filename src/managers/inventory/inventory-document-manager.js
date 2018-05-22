"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../utils/code-generator");

var ProductManager = require('../master/product-manager');
var StorageManager = require('../master/storage-manager');
var UomManager = require('../master/uom-manager');
var InventorySummaryManager = require('./inventory-summary-manager');
var InventoryMovementManager = require('./inventory-movement-manager');

var Models = require("dl-models");
var Map = Models.map;
var InventoryDocumentModel = Models.inventory.InventoryDocument;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class InventoryDocumentManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.inventory.collection.InventoryDocument);

        this.inventorySummaryManager = new InventorySummaryManager(db, user);
        this.inventoryMovementManager = new InventoryMovementManager(db, user);

        this.storageManager = new StorageManager(db, user);
        this.productManager = new ProductManager(db, user);
        this.uomManager = new UomManager(db, user);
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
            var productNameFilter = {
                "items.productName": {
                    "$regex": regex
                }
            };
            var productCodeFilter = {
                "items.productCode": {
                    "$regex": regex
                }
            };
            var codeFilter = {
                "code": {
                    "$regex": regex
                }
            };
            var referenceNoFilter = {
                "referenceNo": {
                    "$regex": regex
                }
            };
            var referenceTypeFilter = {
                "referenceType": {
                    "$regex": regex
                }
            };
            var typeFilter = {
                "type": {
                    "$regex": regex
                }
            };
            var storageFilter = {
                "storageName": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [productNameFilter, productCodeFilter, codeFilter, referenceNoFilter, referenceTypeFilter, typeFilter, storageFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        if (!data.code) {
            data.code = generateCode();
        }
        return Promise.resolve(data);
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((inventoryDocument) => {
                var createMovements = inventoryDocument.items.map(item => {
                    var movementCode = generateCode(item.productId.toString())
                    var movement = {
                        code: movementCode,
                        referenceNo: inventoryDocument.referenceNo,
                        referenceType: inventoryDocument.referenceType,
                        type: inventoryDocument.type,
                        storageId: inventoryDocument.storageId,
                        productId: item.productId,
                        uomId: item.uomId,
                        quantity: item.quantity,
                        stockPlanning: item.stockPlanning,
                        remark: item.remark
                    };
                    return this.inventoryMovementManager.create(movement);
                })

                return Promise.all(createMovements);
            })
            .then(results => id);
    }

    // createIn(inventoryDocument) {
    //     inventoryDocument.type = "IN";
    //     return this.create(inventoryDocument);
    // }

    _validate(inventoryDocument) {
        var errors = {};
        var valid = inventoryDocument;

        var getDbInventoryDocument = this.collection.singleOrDefault({
            _id: new ObjectId(valid._id)
        });

        var getDuplicateInventoryDocument = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });

        var getStorage = valid.storageId && ObjectId.isValid(valid.storageId) ? this.storageManager.getSingleByIdOrDefault(valid.storageId) : Promise.resolve(null);

        valid.items = valid.items || [];
        var productIds = valid.items.map((item) => item.productId && ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : null);
        var uomIds = valid.items.map((item) => item.uomId && ObjectId.isValid(item.uomId) ? new ObjectId(item.uomId) : null);

        var getProducts = productIds.filter((id) => id !== null).length > 0 ? this.productManager.collection.find({
            _id: {
                "$in": productIds
            }
        }).toArray() : Promise.resolve([]);
        var getUoms = uomIds.filter((id) => id !== null).length > 0 ? this.uomManager.collection.find({
            _id: {
                "$in": uomIds
            }
        }).toArray() : Promise.resolve([]);

        return Promise.all([getDbInventoryDocument, getDuplicateInventoryDocument, getStorage, getProducts, getUoms])
            .then(results => {
                var _dbInventoryDocument = results[0];
                var _duplicateInventoryDocument = results[1];
                var _storage = results[2];
                var _products = results[3];
                var _uoms = results[4];

                if (_dbInventoryDocument)
                    valid.code = _dbInventoryDocument.code; // prevent code changes. 
                if (_duplicateInventoryDocument)
                    errors["code"] = i18n.__("InventoryDocument.code.isExist: %s is exist", i18n.__("InventoryDocument.code._:Code"));


                if (!valid.referenceNo || valid.referenceNo === '')
                    errors["referenceNo"] = i18n.__("InventoryDocument.referenceNo.isRequired:%s is required", i18n.__("InventoryDocument.referenceNo._:Reference No"));

                if (!valid.referenceType || valid.referenceType === '')
                    errors["referenceType"] = i18n.__("InventoryDocument.referenceType.isRequired:%s is required", i18n.__("InventoryDocument.referenceType._:Reference Type"));

                if (!valid.type || valid.type === '' || !["IN", "OUT", "RET-IN", "RET-OUT", "ADJ"].find(r => r === valid.type))
                    errors["type"] = i18n.__("InventoryDocument.type.invalid:%s is invalid", i18n.__("InventoryDocument.type._:Type"));


                if (!valid.storageId || valid.storageId === '')
                    errors["storageId"] = i18n.__("InventoryDocument.storageId.isRequired:%s is required", i18n.__("InventoryDocument.storageId._:Storage")); //"Grade harus diisi";   
                else if (!_storage)
                    errors["storageId"] = i18n.__("InventoryDocument.storageId: %s not found", i18n.__("InventoryDocument.storageId._:Storage"));

                if (valid.items && valid.items.length <= 0) {
                    errors["items"] = i18n.__("InventoryDocument.items.isRequired:%s is required", i18n.__("FabricQualityControl.items._: Items")); //"Harus ada minimal 1 barang";
                }
                else {

                    var itemsErrors = [];
                    valid.items.forEach((item, index) => {
                        var itemsError = {};
                        if (!item.productId || item.productId.toString() === "")
                            itemsError["productId"] = i18n.__("InventoryDocument.items.productId.isRequired:%s is required", i18n.__("InventoryDocument.items.productId._:Product"));
                        else if (!_products.find(product => product._id.toString() === item.productId.toString()))
                            itemsError["productId"] = i18n.__("InventoryDocument.items.productId.isNotExist:%s is not exist", i18n.__("InventoryDocument.items.productId._:Product"));

                        if (!item.uomId || item.uomId.toString() === "")
                            itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isRequired:%s is required", i18n.__("InventoryDocument.items.uomId._:UOM"));
                        else if (!_uoms.find(uom => uom._id.toString() === item.uomId.toString()))
                            itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isNotExist:%s is not exist", i18n.__("InventoryDocument.items.uomId._:UOM"));

                        if (!itemsError.productId && !itemsError.uomId) {
                            var dup = valid.items.find((test, idx) => item.productId.toString() === test.productId.toString() && item.uomId.toString() === test.uomId.toString() && index != idx);
                            if (dup)
                                itemsError["productId"] = i18n.__("InventoryDocument.items.productId.isDuplicate:%s is duplicate", i18n.__("InventoryDocument.items.productId._:Product"));
                        }

                        if (item.quantity === 0)
                            itemsError["quantity"] = i18n.__("InventoryDocument.items.quantity.isRequired:%s is required", i18n.__("InventoryDocument.items.quantity._:Quantity"));

                        itemsErrors.push(itemsError);

                        for (var itemsError of itemsErrors) {
                            if (Object.getOwnPropertyNames(itemsError).length > 0) {
                                errors.items = itemsErrors;
                                break;
                            }
                        }
                    })
                }


                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid.storageId = _storage._id;
                valid.storageName = _storage.name;
                valid.storageCode = _storage.code;

                // var process = [];
                for (var item of valid.items) {
                    // process.push(this.getInventorySummary(item.productId, item.uom, item.storageId))
                    var product = _products.find(product => product._id.toString() === item.productId.toString());
                    var uom = _uoms.find(uom => uom._id.toString() === item.uomId.toString());

                    item.productId = product._id;
                    item.productCode = product.code;
                    item.productName = product.name;

                    item.uomId = uom._id;
                    item.uom = uom.unit;
                    item.stockPlanning = item.stockPlanning;
                }

                if (!valid.stamp) {
                    valid = new InventoryDocumentModel(valid);
                }

                // return Promise.all(process).then(res => {
                // for (var i of valid.items) {
                //     if (!(res[0].find(data => data.productId == i.productId))) {
                //         i.stockPlanning = i.quantity;
                //     }
                // }
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
                // })
            })
    }

    getInventorySummary(id, uom, storageId) {
        return new Promise((resolve, reject) => {
            this.inventorySummaryManager.collection.find({ productId: new ObjectId(id), uom: uom, storageId: new ObjectId(storageId) })
                .toArray(function (err, result) {
                    resolve(result);
                });
        })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.inventory.collection.InventoryMovement}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var codeIndex = {
            name: `ix_${Map.inventory.collection.InventoryMovement}__code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}