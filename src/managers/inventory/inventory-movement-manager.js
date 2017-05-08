"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../utils/code-generator");

var ProductManager = require('../master/product-manager');
var StorageManager = require('../master/storage-manager');
var UomManager = require('../master/uom-manager');
var InventorySummaryManager = require('./inventory-summary-manager');

var Models = require("dl-models");
var Map = Models.map;
var InventorySummaryModel = Models.inventory.InventoryMovement;
var InventoryMovementModel = Models.inventory.InventoryMovement;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class InventoryMovementManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.inventory.collection.InventoryMovement);

        this.inventorySummaryManager = new InventorySummaryManager(db, user);
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
                "productName": {
                    "$regex": regex
                }
            };
            var productCodeFilter = {
                "productCode": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [productNameFilter, productCodeFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((inventoryMovement) => {
                var getSum = this.collection.aggregate([{
                    '$match': {
                        storageId: inventoryMovement.storageId,
                        productId: inventoryMovement.productId,
                        uomId: inventoryMovement.uomId 
                    }
                }, {
                    "$group": {
                        _id: null,
                        quantity: {
                            '$sum': '$quantity'
                        }
                    }
                }]).toArray().then(results => results[0]);

                var getSummary = this.inventorySummaryManager.getSert(inventoryMovement.productId, inventoryMovement.storageId, inventoryMovement.uomId);

                return Promise.all([getSum, getSummary])
                    .then(results => {
                        var sum = results[0];
                        var summary = results[1];
                        summary.quantity = sum.quantity;
                        return this.inventorySummaryManager.update(summary)
                    })
                    .then(sumId => id)
            });
    }

    _validate(inventoryMovement) {
        var errors = {};
        var valid = inventoryMovement;

        var getInventorySummary = this.inventorySummaryManager.getSert(valid.productId, valid.storageId, valid.uomId)

        var getProduct = valid.productId && ObjectId.isValid(valid.productId) ? this.productManager.getSingleByIdOrDefault(valid.productId) : Promise.resolve(null);
        var getStorage = valid.storageId && ObjectId.isValid(valid.storageId) ? this.storageManager.getSingleByIdOrDefault(valid.storageId) : Promise.resolve(null);
        var getUom = valid.uomId && ObjectId.isValid(valid.uomId) ? this.uomManager.getSingleByIdOrDefault(valid.uomId) : Promise.resolve(null);

        return Promise.all([getInventorySummary, getProduct, getStorage, getUom])
            .then(results => {
                var _dbInventorySummary = results[0];
                var _product = results[1];
                var _storage = results[2];
                var _uom = results[3];

                if (_dbInventorySummary)
                    valid.code = _dbInventorySummary.code; // prevent code changes.

                if (!valid.referenceNo || valid.referenceNo === '')
                    errors["referenceNo"] = i18n.__("InventoryMovement.referenceNo.isRequired:%s is required", i18n.__("InventoryMovement.referenceNo._:Reference No"));

                if (!valid.referenceType || valid.referenceType === '')
                    errors["referenceType"] = i18n.__("InventoryMovement.referenceType.isRequired:%s is required", i18n.__("InventoryMovement.referenceType._:Reference Type"));


                if (!valid.productId || valid.productId === '')
                    errors["productId"] = i18n.__("InventoryMovement.productId.isRequired:%s is required", i18n.__("InventoryMovement.productId._:Product")); //"Grade harus diisi";   
                else if (!_product)
                    errors["productId"] = i18n.__("InventoryMovement.productId: %s not found", i18n.__("InventoryMovement.productId._:Product"));

                if (!valid.storageId || valid.storageId === '')
                    errors["storageId"] = i18n.__("InventoryMovement.storageId.isRequired:%s is required", i18n.__("InventoryMovement.storageId._:Storage")); //"Grade harus diisi";   
                else if (!_product)
                    errors["storageId"] = i18n.__("InventoryMovement.storageId: %s not found", i18n.__("InventoryMovement.storageId._:Storage"));

                if (!valid.uomId || valid.uomId === '')
                    errors["uomId"] = i18n.__("InventoryMovement.uomId.isRequired:%s is required", i18n.__("InventoryMovement.uomId._:Uom")); //"Grade harus diisi";   
                else if (!_uom)
                    errors["uomId"] = i18n.__("InventoryMovement.uomId: %s not found", i18n.__("InventoryMovement.uomId._:Uom"));


                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }


                valid.productId = _product._id;
                valid.productName = _product.name;
                valid.productCode = _product.code;

                valid.storageId = _storage._id;
                valid.storageName = _storage.name;
                valid.storageCode = _storage.code;

                valid.uomId = _uom._id;
                valid.uom = _uom.unit;

                valid.before = _dbInventorySummary.quantity;
                valid.after = _dbInventorySummary.quantity + valid.quantity;

                if (!valid.stamp) {
                    valid = new InventoryMovementModel(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);


            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.inventory.collection.InventoryMovement}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var productIndex = {
            name: `ix_${Map.inventory.collection.InventoryMovement}__productId`,
            key: {
                productId: 1
            }
        };
        var storageIndex = {
            name: `ix_${Map.inventory.collection.InventoryMovement}__storageId`,
            key: {
                storageId: 1
            }
        };
        var uomIndex = {
            name: `ix_${Map.inventory.collection.InventoryMovement}__uomId`,
            key: {
                uomId: 1
            }
        };

        return this.collection.createIndexes([dateIndex, productIndex, storageIndex, uomIndex]);
    }
}
