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

const PROPERTY_PAIRS = {
    "uomId": "quantity",
    "secondUomId": "secondQuantity",
    "thirdUomId": "thirdQuantity"
}

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

    findSummaryDocument(summaries, storageId, item) {
        var summaryDatum = summaries.find((summary) => {
            var productMatched = false;
            var storageMatched = false;
            var uomMatched = false;
            if (summary) {
                productMatched = item.productId.toString() === summary.productId.toString();
                storageMatched = storageId.toString() === summary.storageId.toString();

                if (summary.secondUomId || summary.thirdUomId)
                    uomMatched = item.uomId.toString() === summary.uomId.toString() || item.uomId.toString() === summary.secondUomId.toString() || item.uomId.toString() === summary.thirdUomId.toString();
                else if (item.secondUomId && item.thirdUomId)
                    uomMatched = item.uomId.toString() === summary.uomId.toString() || item.secondUomId.toString() === summary.uomId.toString() || item.thirdUomId.toString() === summary.uomId.toString();
            }


            return productMatched && storageMatched && uomMatched;
        })

        return summaryDatum;
    }

    searchObjectProperty(object, query) {
        for (var key in object) {
            var value = ObjectId.isValid(object[key]) ? new ObjectId(object[key]) : "";
            if (value.toString() === query) {
                return key;
            }
        }
        return "";
    }

    matchUomField(item, summary) {
        var newItem = {};

        if (summary) {
            if (item.uomId && ObjectId.isValid(item.uomId)) {
                var firstKey = this.searchObjectProperty(summary, item.uomId.toString())
                if (firstKey) {
                    newItem[firstKey] = item.uomId;
                    newItem[PROPERTY_PAIRS[firstKey]] = item.quantity;
                }
            }

            if (item.secondUomId && ObjectId.isValid(item.secondUomId)) {
                var secondKey = this.searchObjectProperty(summary, item.secondUomId.toString())
                if (secondKey) {
                    newItem[secondKey] = item.secondUomId;
                    newItem[PROPERTY_PAIRS[secondKey]] = item.secondQuantity;
                }
            }

            if (item.thirdUomId && ObjectId.isValid(item.thirdUomId)) {
                var thirdKey = this.searchObjectProperty(summary, item.thirdUomId.toString())
                if (thirdKey) {
                    newItem[thirdKey] = item.thirdUomId;
                    newItem[PROPERTY_PAIRS[thirdKey]] = item.thirdQuantity;
                }
            }

            if (ObjectId.isValid(item.secondUomId) && !ObjectId.isValid(item.thirdUomId)) {
                if (!newItem.secondUomId) {
                    if (ObjectId.isValid(summary.secondUomId)) {
                        newItem.secondUomId = summary.secondUomId;
                        newItem.secondQuantity = 0;
                    } else if (!ObjectId.isValid(summary.secondUomId)) {
                        if (item.secondUomId.toString() === summary.uomId.toString()) {
                            newItem.secondUomId = item.uomId;
                            newItem.secondQuantity = item.quantity;
                        } else {
                            newItem.secondUomId = item.secondUomId;
                            newItem.secondQuantity = item.secondQuantity;
                        }
                    }
                }
                if (!newItem.thirdUomId) {
                    if (ObjectId.isValid(summary.thirdUomId)) {
                        newItem.thirdUomId = summary.thirdUomId;
                        newItem.thirdQuantity = 0;
                    }
                }
            } else if (ObjectId.isValid(item.thirdUomId) && !ObjectId.isValid(summary.thirdUomId)) {
                if (newItem.uomId.toString() !== item.uomId.toString() && newItem.secondUomId.toString() !== item.uomId.toString()) {
                    newItem.thirdUomId === item.uomId;
                    newItem.thirdQuantity === item.quantity;
                } else if (newItem.uomId.toString() !== item.secondUomId.toString() && newItem.secondUomId.toString() !== item.secondUomId.toString()) {
                    newItem.thirdUomId === item.secondUomId;
                    newItem.thirdQuantity === item.secondQuantity;
                } else if (newItem.uomId.toString() !== item.thirdUomId.toString() && newItem.secondUomId.toString() !== item.thirdUomId.toString()) {
                    newItem.thirdUomId === item.thirdUomId;
                    newItem.thirdQuantity === item.thirdQuantity;
                }
            }
        }

        if (Object.getOwnPropertyNames(newItem).length === 0) {
            newItem = item;
        }

        return newItem;
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((inventoryDocument) => {
                var inventoryDocument = inventoryDocument;

                var uomIds = inventoryDocument.items.map((item) => item.uomId && ObjectId.isValid(item.uomId) ? new ObjectId(item.uomId) : null);
                var secondUomIds = inventoryDocument.items.map((item) => item.secondUomId && ObjectId.isValid(item.secondUomId) ? new ObjectId(item.secondUomId) : null);
                var thirdUomIds = inventoryDocument.items.map((item) => item.thirdUomId && ObjectId.isValid(item.thirdUomId) ? new ObjectId(item.thirdUomId) : null);

                var searchInventory = inventoryDocument.items.length > 0 ? inventoryDocument.items.map((item) => {
                    var itemUomIds = [];
                    var productId = item.productId && ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : null;
                    var storageId = inventoryDocument.storageId && ObjectId.isValid(inventoryDocument.storageId) ? new ObjectId(inventoryDocument.storageId) : null;
                    var uomId = item.uomId && ObjectId.isValid(item.uomId) ? itemUomIds.push(new ObjectId(item.uomId)) : null;
                    var secondUomId = item.secondUomId && ObjectId.isValid(item.secondUomId) ? itemUomIds.push(new ObjectId(item.secondUomId)) : null;
                    var thirdUomId = item.thirdUomId && ObjectId.isValid(item.thirdUomId) ? itemUomIds.push(new ObjectId(item.thirdUomId)) : null;
                    return this.inventorySummaryManager.collection.findOne({
                        "$and": [{ "productId": productId }, { "storageId": storageId }, { "$or": [{ "uomId": { "$in": itemUomIds } }, { "secondUomId": { "$in": itemUomIds } }, { "thirdUomId": { "$in": itemUomIds } }] }]
                    })
                }) : [];

                return Promise.all(searchInventory)
                    .then((results) => {
                        var inventorySummaries = results;

                        var createMovements = inventoryDocument.items.map((item) => {

                            var summaryDatum = this.findSummaryDocument(inventorySummaries, inventoryDocument.storageId, item);

                            var newItem = this.matchUomField(item, summaryDatum);

                            var movementCode = generateCode(item.productId.toString())
                            var movement = {
                                code: movementCode,
                                referenceNo: inventoryDocument.referenceNo,
                                referenceType: inventoryDocument.referenceType,
                                type: inventoryDocument.type,
                                storageId: inventoryDocument.storageId,
                                productId: item.productId,
                                uomId: newItem.uomId ? newItem.uomId : summaryDatum.uomId,
                                secondUomId: newItem.secondUomId ? newItem.secondUomId : summaryDatum && summaryDatum.secondUomId ? summaryDatum.secondUomId : null,
                                thirdUomId: newItem.thirdUomId ? newItem.thirdUomId : summaryDatum && summaryDatum.thirdUomId ? summaryDatum.thirdUomId : null,
                                quantity: newItem.quantity ? newItem.quantity : 0,
                                secondQuantity: newItem.secondQuantity ? newItem.secondQuantity : 0,
                                thirdQuantity: newItem.thirdQuantity ? newItem.thirdQuantity : 0,
                                remark: item.remark
                            };
                            return this.inventoryMovementManager.create(movement);
                        })

                        return Promise.all(createMovements)
                            .then((results) => {
                                return Promise.resolve(id)
                            })
                    })
            })
    }

    // _afterInsert(id) {
    //     return this.getSingleById(id)
    //         .then((inventoryDocument) => {
    //             var createMovements = inventoryDocument.items.map(item => {
    //                 var movementCode = generateCode(item.productId.toString())
    //                 var movement = {
    //                     code: movementCode,
    //                     referenceNo: inventoryDocument.referenceNo,
    //                     referenceType: inventoryDocument.referenceType,
    //                     type: inventoryDocument.type,
    //                     storageId: inventoryDocument.storageId,
    //                     productId: item.productId,
    //                     uomId: item.uomId,
    //                     secondUomId: item.secondUomId ? item.secondUomId : {},
    //                     thirdUomId: item.thirdUomId ? item.thirdUomId : {},
    //                     quantity: item.quantity,
    //                     secondQuantity: item.secondQuantity ? item.secondQuantity : 0,
    //                     thirdQuantity: item.thirdQuantity ? item.thirdQuantity : 0,
    //                     remark: item.remark
    //                 };
    //                 return this.inventoryMovementManager.create(movement);
    //             })

    //             return Promise.all(createMovements);
    //         })
    //         .then(results => id);
    // }

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
        var secondUomIds = valid.items.map((item) => item.secondUomId && ObjectId.isValid(item.secondUomId) ? new ObjectId(item.secondUomId) : null);
        var thirdUomIds = valid.items.map((item) => item.thirdUomId && ObjectId.isValid(item.thirdUomId) ? new ObjectId(item.thirdUomId) : null);

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
        var getSecondUoms = secondUomIds.filter((id) => id !== null).length > 0 ? this.uomManager.collection.find({
            _id: {
                "$in": secondUomIds
            }
        }).toArray() : Promise.resolve([]);
        var getThirdUoms = thirdUomIds.filter((id) => id !== null).length > 0 ? this.uomManager.collection.find({
            _id: {
                "$in": thirdUomIds
            }
        }).toArray() : Promise.resolve([]);
        var getInventorySummaries = valid.items.length > 0 ? valid.items.map((item) => {
            var itemUomIds = [];
            var productId = item.productId && ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : null;
            var storageId = valid.storageId && ObjectId.isValid(valid.storageId) ? new ObjectId(valid.storageId) : null;
            var uomId = item.uomId && ObjectId.isValid(item.uomId) ? itemUomIds.push(new ObjectId(item.uomId)) : null;
            var secondUomId = item.secondUomId && ObjectId.isValid(item.secondUomId) ? itemUomIds.push(new ObjectId(item.secondUomId)) : null;
            var thirdUomId = item.thirdUomId && ObjectId.isValid(item.thirdUomId) ? itemUomIds.push(new ObjectId(item.thirdUomId)) : null;
            return this.inventorySummaryManager.collection.findOne({
                "$and": [{ "productId": productId }, { "storageId": storageId }, { "$or": [{ "uomId": { "$in": itemUomIds } }, { "secondUomId": { "$in": itemUomIds } }, { "thirdUomId": { "$in": itemUomIds } }] }]
            })
        }) : Promise.resolve([]);

        return Promise.all([getDbInventoryDocument, getDuplicateInventoryDocument, getStorage, getProducts, getUoms, getSecondUoms, getThirdUoms].concat(getInventorySummaries))
            .then((results) => {
                var _dbInventoryDocument = results[0];
                var _duplicateInventoryDocument = results[1];
                var _storage = results[2];
                var _products = results[3];
                var _uoms = results[4];
                var _secondUoms = results[5];
                var _thirdUoms = results[6];
                var _summaries = results.slice(7, results.length);

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


                if (!valid.storageId || valid.storageId.toString() === '')
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

                        var existSecondUom = _secondUoms.find((uom) => item.secondUomId && uom._id.toString() === item.secondUomId.toString());
                        var existThirdUom = _thirdUoms.find((uom) => item.thirdUomId && uom._id.toString() === item.thirdUomId.toString());

                        var existProduct = _products.find((product) => product._id.toString() === item.productId.toString());
                        if (!item.productId || item.productId.toString() === "")
                            itemsError["productId"] = i18n.__("InventoryDocument.items.productId.isRequired:%s is required", i18n.__("InventoryDocument.items.productId._:Product"));
                        else if (!existProduct)
                            itemsError["productId"] = i18n.__("InventoryDocument.items.productId.isNotExist:%s is not exist", i18n.__("InventoryDocument.items.productId._:Product"));

                        var existUom = (item.uomId || item.uomId.toString() !== "") ? _uoms.find((uom) => uom._id.toString() === item.uomId.toString()) : null;
                        if (!item.uomId || item.uomId.toString() === "")
                            itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isRequired:%s is required", i18n.__("InventoryDocument.items.uomId._:UOM"));
                        else if (!existUom)
                            itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isNotExist:%s is not exist", i18n.__("InventoryDocument.items.uomId._:UOM"));
                        else if (existUom) {
                            if (item.secondUomId && ObjectId.isValid(item.secondUomId)) {
                                if (item.secondUomId.toString() === item.uomId.toString())
                                    itemsError["secondUomId"] = i18n.__("InventoryDocument.items.secondUomId.isDuplicate:%s is duplicate with UOM Ke-1", i18n.__("InventoryDocument.items.secondUomId._:UOM Ke-2"));
                                else if (!existSecondUom)
                                    itemsError["secondUomId"] = i18n.__("InventoryDocument.items.secondUomId.isNotExist:%s is not exist", i18n.__("InventoryDocument.items.secondUomId._:UOM Ke-2"));
                                else if (existSecondUom)
                                    if (item.secondQuantity === 0)
                                        itemsError["secondQuantity"] = i18n.__("InventoryDocument.items.secondQuantity.isNotExist:%s should not be empty", i18n.__("InventoryDocument.items.secondQuantity._:Quantity Ke-2"));
                            }

                            if (item.thirdUomId && ObjectId.isValid(item.thirdUomId)) {
                                if (!item.secondUomId || !ObjectId.isValid(item.secondUomId))
                                    itemsError["secondUomId"] = i18n.__("InventoryDocument.items.secondUomId.isNotExist:%s should exist", i18n.__("InventoryDocument.items.secondUomId._:UOM Ke-2"));
                                else if (item.thirdUomId.toString() === item.uomId.toString())
                                    itemsError["thirdUomId"] = i18n.__("InventoryDocument.items.thirdUomId.isDuplicate:%s is duplicate with UOM Ke-1", i18n.__("InventoryDocument.items.thirdUomId._:UOM Ke-3"));
                                else if (item.thirdUomId.toString() === item.secondUomId.toString()) {
                                    itemsError["thirdUomId"] = i18n.__("InventoryDocument.items.thirdUomId.isDuplicate:%s is duplicate with UOM Ke-2", i18n.__("InventoryDocument.items.thirdUomId._:UOM Ke-3"));
                                } else if (existThirdUom)
                                    if (item.thirdQuantity === 0)
                                        itemsError["thirdQuantity"] = i18n.__("InventoryDocument.items.secondQuantity.isNotValid:%s should not be empty", i18n.__("InventoryDocument.items.secondQuantity._:Quantity Ke-2"));
                            }
                        }

                        if (item.quantity === 0)
                            itemsError["quantity"] = i18n.__("InventoryDocument.items.quantity.isRequired:%s is required", i18n.__("InventoryDocument.items.quantity._:Quantity"));

                        if (Object.getOwnPropertyNames(itemsError).length === 0) {
                            if ((item.productId && item.productId.toString() !== "" && existProduct) && (valid.storageId && valid.storageId.toString() && _storage) && (item.uomId && item.uomId.toString() !== "" && existUom)) {
                                var summaryDatum = this.findSummaryDocument(_summaries, valid.storageId, item);

                                if (summaryDatum) {
                                    if (ObjectId.isValid(summaryDatum.thirdUomId)) {
                                        if (ObjectId.isValid(item.uomId) && item.uomId.toString() !== summaryDatum.uomId.toString() && item.uomId.toString() !== summaryDatum.secondUomId.toString() && item.uomId.toString() !== summaryDatum.thirdUomId.toString()) {
                                            itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isNotExist:%s is not exist in Summary", i18n.__("InventoryDocument.items.uomId._:UOM Ke-1"));
                                        } else if (ObjectId.isValid(item.secondUomId) && item.secondUomId.toString() !== summaryDatum.uomId.toString() && item.secondUomId.toString() !== summaryDatum.secondUomId.toString() && item.secondUomId.toString() !== summaryDatum.thirdUomId.toString()) {
                                            itemsError["secondUomId"] = i18n.__("InventoryDocument.items.secondUomId.isNotExist:%s is not exist in Summary", i18n.__("InventoryDocument.items.secondUomId._:UOM Ke-2"));
                                        } else if (ObjectId.isValid(item.thirdUomId) && item.thirdUomId.toString() !== summaryDatum.uomId.toString() && item.thirdUomId.toString() !== summaryDatum.secondUomId.toString() && item.thirdUomId.toString() !== summaryDatum.thirdUomId.toString()) {
                                            itemsError["thirdUomId"] = i18n.__("InventoryDocument.items.thirdUomId.isNotExist:%s is not exist in Summary", i18n.__("InventoryDocument.items.thirdUomId._:UOM Ke-2"));
                                        }
                                    } else if (!ObjectId.isValid(summaryDatum.thirdUomId) && ObjectId.isValid(summaryDatum.secondUomId)) {
                                        if (ObjectId.isValid(item.uomId) && ObjectId.isValid(item.secondUomId) && ObjectId.isValid(item.thirdUomId)) {
                                            if ((item.uomId.toString() !== summaryDatum.uomId.toString() && item.secondUomId.toString() !== summaryDatum.secondUomId.toString())) {
                                                if ((item.uomId.toString() !== summaryDatum.secondUomId.toString() && item.secondUomId.toString() !== summaryDatum.uomId.toString())) {
                                                    itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isNotValid:%s should have at least one pair that similar to summary", i18n.__("InventoryDocument.items.uomId._:UOM Ke-1"));
                                                    itemsError["secondUomId"] = i18n.__("InventoryDocument.items.secondUomId.isNotValid:%s should have at least one pair that similar to summary", i18n.__("InventoryDocument.items.secondUomId._:UOM Ke-2"));
                                                    itemsError["thirdUomId"] = i18n.__("InventoryDocument.items.thirdUomId.isNotValid:%s should have at least one pair that similar to summary", i18n.__("InventoryDocument.items.thirdUomId._:UOM Ke-3"));
                                                } else if ((item.secondUomId.toString() !== summaryDatum.uomId.toString() && item.thirdUomId.toString() !== summaryDatum.secondUomId.toString())) {
                                                    if (item.secondUomId.toString() !== summaryDatum.secondUomId.toString() && item.thirdUomId.toString() !== summaryDatum.uomId.toString()) {
                                                        itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isNotValid:%s should have at least one pair that similar to summary", i18n.__("InventoryDocument.items.uomId._:UOM Ke-1"));
                                                        itemsError["secondUomId"] = i18n.__("InventoryDocument.items.secondUomId.isNotValid:%s should have at least one pair that similar to summary", i18n.__("InventoryDocument.items.secondUomId._:UOM Ke-2"));
                                                        itemsError["thirdUomId"] = i18n.__("InventoryDocument.items.thirdUomId.isNotValid:%s should have at least one pair that similar to summary", i18n.__("InventoryDocument.items.thirdUomId._:UOM Ke-3"));
                                                    }
                                                } else if (item.uomId.toString() !== summaryDatum.uomId.toString() && item.thirdUomId.toString() !== summaryDatum.secondUomId.toString()) {
                                                    if (item.uomId.toString() !== summaryDatum.secondUomId.toString() && item.thirdUomId.toString() !== summaryDatum.uomId.toString()) {
                                                        itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isNotValid:%s should have at least one pair that similar to summary", i18n.__("InventoryDocument.items.uomId._:UOM Ke-1"));
                                                        itemsError["secondUomId"] = i18n.__("InventoryDocument.items.secondUomId.isNotValid:%s should have at least one pair that similar to summary", i18n.__("InventoryDocument.items.secondUomId._:UOM Ke-2"));
                                                        itemsError["thirdUomId"] = i18n.__("InventoryDocument.items.thirdUomId.isNotValid:%s should have at least one pair that similar to summary", i18n.__("InventoryDocument.items.thirdUomId._:UOM Ke-3"));
                                                    }
                                                }
                                            }
                                        } else if (!ObjectId.isValid(item.thirdUomId) && ObjectId.isValid(item.uomId) && ObjectId.isValid(item.secondUomId)) {
                                            if ((item.uomId.toString() !== summaryDatum.uomId.toString() && item.secondUomId.toString() !== summaryDatum.secondUomId.toString())) {
                                                if ((item.uomId.toString() !== summaryDatum.secondUomId.toString() && item.secondUomId.toString() !== summaryDatum.uomId.toString())) {
                                                    itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isNotValid:%s should have one pair that similar to summary", i18n.__("InventoryDocument.items.uomId._:UOM Ke-1"));
                                                    itemsError["secondUomId"] = i18n.__("InventoryDocument.items.secondUomId.isNotValid:%s should have one pair that similar to summary", i18n.__("InventoryDocument.items.secondUomId._:UOM Ke-2"));
                                                }
                                            }
                                        } else if (!ObjectId.isValid(item.thirdUomId) && !ObjectId.isValid(item.secondUomId) && ObjectId.isValid(item.uomId)) {
                                            if (item.uomId.toString() !== summaryDatum.uomId.toString()) {
                                                itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isNotValid:%s is not similar with UOM Ke-1 in Summary", i18n.__("InventoryDocument.items.uomId._:UOM Ke-1"));
                                            }
                                        }
                                    } else if (!ObjectId.isValid(summaryDatum.thirdUomId) && !ObjectId.isValid(summaryDatum.secondUomId)) {
                                        if (item.uomId.toString() !== summaryDatum.uomId.toString() && item.secondUomId.toString() !== summaryDatum.uomId.toString() && item.thirdUomId.toString() !== summaryDatum.uomId.toString()) {
                                            itemsError["uomId"] = i18n.__("InventoryDocument.items.uomId.isNotValid:%s should have at least 1 UOM similar with UOM Ke-1 in Summary", i18n.__("InventoryDocument.items.uomId._:UOM Ke-1"));
                                            itemsError["secondUomId"] = i18n.__("InventoryDocument.items.secondUomId.isNotValid:%s should have at least 1 UOM similar with UOM Ke-1 in Summary", i18n.__("InventoryDocument.items.secondUomId._:UOM Ke-2"));
                                            itemsError["thirdUomId"] = i18n.__("InventoryDocument.items.thirdUomId.isNotValid:%s should have at least 1 UOM similar with UOM Ke-1 in Summary", i18n.__("InventoryDocument.items.thirdUomId._:UOM Ke-3"));
                                        }
                                    }
                                }
                            }
                        }

                        if (!itemsError.productId) {
                            var dup = valid.items.find((test, idx) => item.productId.toString() === test.productId.toString() && index != idx);
                            if (dup)
                                itemsError["productId"] = i18n.__("InventoryDocument.items.productId.isDuplicate:%s is duplicate", i18n.__("InventoryDocument.items.productId._:Product"));
                        }

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

                for (var item of valid.items) {
                    var product = _products.find(product => product._id.toString() === item.productId.toString());
                    var uom = _uoms.find(uom => uom._id.toString() === item.uomId.toString());
                    var secondUom = _secondUoms.find((secondUom) => secondUom._id.toString() === item.secondUomId.toString())
                    var thirdUom = _thirdUoms.find((thirdUom) => thirdUom._id.toString() === item.thirdUomId.toString())

                    item.productId = product._id;
                    item.productCode = product.code;
                    item.productName = product.name;

                    item.uomId = uom._id;
                    item.uom = uom.unit;

                    item.secondUomId = secondUom && secondUom._id ? secondUom._id : {};
                    item.secondUom = secondUom && secondUom.unit ? secondUom.unit : "";

                    item.thirdUomId = thirdUom && thirdUom._id ? thirdUom._id : {};
                    item.thirdUom = thirdUom && thirdUom.unit ? thirdUom.unit : "";
                }

                if (!valid.stamp) {
                    valid = new InventoryDocumentModel(valid);
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
