"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../utils/code-generator");

var GarmentProductManager = require('../master/garment-product-manager');
var StorageManager = require('../master/storage-manager');
var UomManager = require('../master/uom-manager');
var GarmentInventorySummaryManager = require('./garment-inventory-summary-manager');

var Models = require("dl-models");
var Map = Models.map;
var GarmentInventorySummaryModel = Models.garmentInventory.GarmentInventorySummary;
var GarmentInventoryMovementModel = Models.garmentInventory.GarmentInventoryMovement;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class GarmentInventoryMovementManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.garmentInventory.collection.GarmentInventoryMovement);

        this.garmentInventorySummaryManager = new GarmentInventorySummaryManager(db, user);
        this.storageManager = new StorageManager(db, user);
        this.productManager = new GarmentProductManager(db, user);
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
            .then((garmentInventoryMovement) => {
                var getSum = this.collection.aggregate([{
                    '$match': {
                        storageId: garmentInventoryMovement.storageId,
                        productId: garmentInventoryMovement.productId,
                        uomId: garmentInventoryMovement.uomId
                       
                    }
                }, {
                        "$group": {
                            _id: null,
                            quantity: {
                                '$sum': '$quantity'
                            }
                        }
                    }]).toArray().then(results => results[0]);

                var getSummary = this.garmentInventorySummaryManager.getSert(garmentInventoryMovement.productId, garmentInventoryMovement.storageId, garmentInventoryMovement.uomId);

                return Promise.all([getSum, getSummary])
                    .then(results => {
                        var sum = results[0];
                        var summary = results[1];
                        summary.quantity = sum.quantity;
                        return this.garmentInventorySummaryManager.update(summary)
                    })
                    .then(sumId => id)
            });
    }

    _validate(garmentInventoryMovement) {
        var errors = {};
        var valid = garmentInventoryMovement;

        var getGarmentInventorySummary = this.garmentInventorySummaryManager.getSert(valid.productId, valid.storageId, valid.uomId)
        var getProduct = valid.productId && ObjectId.isValid(valid.productId) ? this.productManager.getSingleByIdOrDefault(valid.productId) : Promise.resolve(null);
        var getStorage = valid.storageId && ObjectId.isValid(valid.storageId) ? this.storageManager.getSingleByIdOrDefault(valid.storageId) : Promise.resolve(null);
        var getUom = valid.uomId && ObjectId.isValid(valid.uomId) ? this.uomManager.getSingleByIdOrDefault(valid.uomId) : Promise.resolve(null);

        return Promise.all([getGarmentInventorySummary, getProduct, getStorage, getUom])
            .then(results => {
                var _dbGarmentInventorySummary = results[0];
                var _product = results[1];
                var _storage = results[2];
                var _uom = results[3];

                if (_dbGarmentInventorySummary)
                    valid.code = _dbGarmentInventorySummary.code; // prevent code changes.

                if (!valid.referenceNo || valid.referenceNo === '')
                    errors["referenceNo"] = i18n.__("GarmentInventoryMovement.referenceNo.isRequired:%s is required", i18n.__("GarmentInventoryMovement.referenceNo._:Reference No"));

                if (!valid.referenceType || valid.referenceType === '')
                    errors["referenceType"] = i18n.__("GarmentInventoryMovement.referenceType.isRequired:%s is required", i18n.__("GarmentInventoryMovement.referenceType._:Reference Type"));

                if (!valid.productId || valid.productId === '')
                    errors["productId"] = i18n.__("GarmentInventoryMovement.productId.isRequired:%s is required", i18n.__("GarmentInventoryMovement.productId._:Product")); //"Grade harus diisi";   
                else if (!_product)
                    errors["productId"] = i18n.__("GarmentInventoryMovement.productId: %s not found", i18n.__("GarmentInventoryMovement.productId._:Product"));

                if (!valid.storageId || valid.storageId === '')
                    errors["storageId"] = i18n.__("GarmentInventoryMovement.storageId.isRequired:%s is required", i18n.__("GarmentInventoryMovement.storageId._:Storage")); //"Grade harus diisi";   
                else if (!_product)
                    errors["storageId"] = i18n.__("GarmentInventoryMovement.storageId: %s not found", i18n.__("GarmentInventoryMovement.storageId._:Storage"));

                if (!valid.uomId || valid.uomId === '')
                    errors["uomId"] = i18n.__("GarmentInventoryMovement.uomId.isRequired:%s is required", i18n.__("GarmentInventoryMovement.uomId._:Uom")); //"Grade harus diisi";   
                else if (!_uom)
                    errors["uomId"] = i18n.__("GarmentInventoryMovement.uomId: %s not found", i18n.__("GarmentInventoryMovement.uomId._:Uom"));

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
              
                if (valid.type == "OUT") {
                    valid.quantity = valid.quantity * -1;
                }
                
                valid.before = _dbGarmentInventorySummary.quantity;

                if (valid.type == "ADJ") {
                    valid.after = valid.quantity;
                } else {
                    valid.after = _dbGarmentInventorySummary.quantity + valid.quantity;
                }
                
                if (!valid.stamp) {
                    valid = new GarmentInventoryMovementModel(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);

            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.garmentInventory.collection.GarmentInventoryMovement}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var productIndex = {
            name: `ix_${Map.garmentInventory.collection.GarmentInventoryMovement}__productId`,
            key: {
                productId: 1
            }
        };
        var storageIndex = {
            name: `ix_${Map.garmentInventory.collection.GarmentInventoryMovement}__storageId`,
            key: {
                storageId: 1
            }
        };
        var uomIndex = {
            name: `ix_${Map.garmentInventory.collection.GarmentInventoryMovement}__uomId`,
            key: {
                uomId: 1
            }
        };

        return this.collection.createIndexes([dateIndex, productIndex, storageIndex, uomIndex]);
    }

    

   
}
