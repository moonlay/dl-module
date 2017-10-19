"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../utils/code-generator");

var GarmentProductManager = require('../master/garment-product-manager');
var StorageManager = require('../master/storage-manager');
var UomManager = require('../master/uom-manager');

var Models = require("dl-models");
var Map = Models.map;
var GarmentInventorySummaryModel = Models.garmentInventory.GarmentInventorySummary;
var GarmentInventoryMovementModel = Models.garmentInventory.GarmentInventoryMovement;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class GarmentInventorySummaryManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.garmentInventory.collection.GarmentInventorySummary);

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
            var storageNameFilter = {
                "storageName": {
                    "$regex": regex
                }
            };
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
            keywordFilter["$or"] = [productNameFilter, productCodeFilter, storageNameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

  
     _validate(garmentInventorySummary) {
        var errors = {};
        var valid = garmentInventorySummary;

        var getDbGarmentInventorySummary = this.collection.singleOrDefault({
            productId: new ObjectId(valid.productId),
            storageId: new ObjectId(valid.storageId),
            uomId: new ObjectId(valid.uomId)
        });

        var getDuplicateGarmentInventorySummary = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            productId: new ObjectId(valid.productId),
            storageId: new ObjectId(valid.storageId),
            uomId: new ObjectId(valid.uomId)
        });

        var getProduct = valid.productId && ObjectId.isValid(valid.productId) ? this.productManager.getSingleByIdOrDefault(valid.productId) : Promise.resolve(null);
        var getStorage = valid.storageId && ObjectId.isValid(valid.storageId) ? this.storageManager.getSingleByIdOrDefault(valid.storageId) : Promise.resolve(null);
        var getUom = valid.uomId && ObjectId.isValid(valid.uomId) ? this.uomManager.getSingleByIdOrDefault(valid.uomId) : Promise.resolve(null);

        return Promise.all([getDbGarmentInventorySummary,getDuplicateGarmentInventorySummary, getProduct, getStorage, getUom])
            .then(results => {
                var _dbGarmentInventorySummary = results[0]; 
                var _dbDuplicateGarmentInventorySummary = results[1];
                var _product = results[2];
                var _storage = results[3];
                var _uom = results[4];

                if (_dbGarmentInventorySummary)
                {
                    // prevent key changes.
                    valid.code = _dbGarmentInventorySummary.code;
                }

                if (_dbDuplicateGarmentInventorySummary)
                    errors["productId"] = errors["storageId"] = errors["uomId"] = i18n.__("InventorySummary.key.isExist:%s is exist", i18n.__("GarmentInventorySummary.key._:Key"));

                if (!valid.productId || valid.productId === '')
                    errors["productId"] = i18n.__("GarmentInventorySummary.productId.isRequired:%s is required", i18n.__("GarmentInventorySummary.productId._:Product")); //"Grade harus diisi";   
                else if (!_product)
                    errors["productId"] = i18n.__("GarmentInventorySummary.productId: %s not found", i18n.__("GarmentInventorySummary.productId._:Product"));

                if (!valid.storageId || valid.storageId === '')
                    errors["storageId"] = i18n.__("GarmentInventorySummary.storageId.isRequired:%s is required", i18n.__("GarmentInventorySummary.storageId._:Storage")); //"Grade harus diisi";   
                else if (!_product)
                    errors["storageId"] = i18n.__("GarmentInventorySummary.storageId:%s not found", i18n.__("GarmentInventorySummary.storageId._:Storage"));

              
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
           
            

                if (!valid.stamp) {
                    valid = new GarmentInventorySummaryModel(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);

            })
    }
_beforeInsert(data) {
        data.code = generateCode();
        
        return Promise.resolve(data);
    }

    getSert(productId, storageId, uomId) {
        var query = {
            productId: new ObjectId(productId),
            storageId: new ObjectId(storageId),
            uomId: new ObjectId(uomId)
        }

        return this.getSingleByQueryOrDefault(query)
            .then((doc) => {
                if (doc)
                    return doc;
                else
                    return this.create(query)
                        .then(id => this.getSingleById(id));
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.garmentInventory.collection.GarmentInventorySummary}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var keyIndex = {
            name: `ix_${Map.garmentInventory.collection.GarmentInventorySummary}__productId_storageId_uomId`,
            key: {
                productId: 1,
                storageId: 1,
                uomId: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, keyIndex]);
    }
}
