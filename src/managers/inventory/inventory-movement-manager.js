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
        this.inventoryDocumentCollection = this.db.use(Map.inventory.collection.InventoryDocument);

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
        if (!data.code)
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
                        },
                        stockPlanning: {
                            '$sum': '$stockPlanning'
                        }
                    }
                }]).toArray().then(results => results[0]);

                var getSummary = this.inventorySummaryManager.getSert(inventoryMovement.productId, inventoryMovement.storageId, inventoryMovement.uomId);

                return Promise.all([getSum, getSummary])
                    .then(results => {
                        var sum = results[0];
                        var summary = results[1];
                        summary.quantity = parseFloat(sum.quantity.toFixed(2));
                        summary.stockPlanning = parseFloat(sum.stockPlanning.toFixed(2));
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
                else if (!_storage)
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

                valid.stockPlanning = valid.referenceType == "Bon Pengantar Greige" ? valid.type == "OUT" ? valid.stockPlanning : valid.stockPlanning * -1 : valid.quantity;


                if (valid.referenceType == "Surat Permintaan Barang") {
                    valid.stockPlanning = valid.type == "OUT" ? valid.quantity * -1 : valid.quantity;
                    valid.quantity = 0;
                }

                if (valid.type == "OUT") {
                    valid.quantity = valid.quantity * -1;
                }

                valid.before = _dbInventorySummary.quantity;

                if (valid.type == "ADJ") {
                    valid.after = valid.quantity;
                    valid.stockPlanning = valid.quantity;
                } else {
                    valid.after = _dbInventorySummary.quantity + valid.quantity;
                }

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

    getReferenceNo(query) {
        return this.inventoryDocumentCollection.find({
            _deleted: false,
            date: query
        }, { "referenceNo": 1, "date": 1 }).toArray()
            .then((data) => {
                var result = {
                    referenceNumbers: [],
                    inventoryDocumentsDate: []
                };

                for (let d of data) {
                    result.referenceNumbers.push(d.referenceNo);
                    result.inventoryDocumentsDate.push({
                        referenceNo: d.referenceNo,
                        date: d.date
                    });
                }

                // var referenceNumbers = data.map((inventoryDocument) => {
                //     return { referenceNo: inventoryDocument.referenceNo, date: date };
                // })
                return Promise.resolve(result)
            })
    }

    getMovementReport(info) {
        var _defaultFilter = {
            _deleted: false
        },
            query = {},
            order = info.order || {};

        var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
        var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59")) : new Date(new Date().setHours(23, 59, 59, 0));
        dateFrom.setHours(dateFrom.getHours() - info.offset);
        dateTo.setHours(dateTo.getHours() - info.offset);

        var filterMovement = {};
        let inventoryDocumentsDate = [];

        if (info.storageId)
            filterMovement.storageId = new ObjectId(info.storageId);

        if (info.type && info.type != "")
            filterMovement.type = info.type;

        if (info.productId)
            filterMovement.productId = new ObjectId(info.productId);

        var dateQuery = {
            $gte: dateFrom,
            $lte: dateTo
        }

        return this.getReferenceNo(dateQuery)
            .then((result) => {
                filterMovement.referenceNo = {
                    $in: result.referenceNumbers
                };

                inventoryDocumentsDate = result.inventoryDocumentsDate;

                return this._createIndexes()
                    .then((createIndexResults) => {
                        query = { '$and': [_defaultFilter, filterMovement] };
                        return !info.xls ?
                            this.collection
                                .where(query)
                                .order(order)
                                .execute() :
                            this.collection
                                .where(query)
                                .page(info.page, info.size)
                                .order(order)
                                .execute();
                    })
                    .then(response => {
                        for (let d of response.data) {
                            let inventoryDocument = inventoryDocumentsDate.find(p => p.referenceNo == d.referenceNo);

                            d.date = inventoryDocument.date;
                        }

                        return Promise.resolve(response);
                    });
            });
    }

    getXls(result, filter) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for (var movement of result.data) {
            index++;

            var item = {};
            item["No"] = index;
            item["Storage"] = movement.storageName ? movement.storageName : '';
            item["Nomor Referensi"] = movement.referenceType ? movement.referenceNo : '';
            item["Tipe Referensi"] = movement.referenceType ? movement.referenceType : '';
            item["Tanggal"] = movement.date ? moment(movement.date).format(dateFormat) : '';
            item["Nama Barang"] = movement.productName ? movement.productName : '';
            item["UOM"] = movement.uom ? movement.uom : '';
            item["Before"] = movement.before ? movement.before : 0;
            item["Kuantiti"] = movement.quantity ? movement.quantity : 0;
            item["After"] = movement.after ? movement.after : 0;
            item["Status"] = movement.type ? movement.type : '';

            xls.data.push(item);
        }

        xls.options["No"] = "number";
        xls.options["Storage"] = "string";
        xls.options["Nomor Referensi"] = "string";
        xls.options["Tipe Referensi"] = "string";
        xls.options["Tanggal"] = "string";
        xls.options["Nama Barang"] = "string";
        xls.options["UOM"] = "string";
        xls.options["Before"] = "number";
        xls.options["Kuantiti"] = "number";
        xls.options["After"] = "number";
        xls.options["Status"] = "string";

        if (filter.dateFrom && filter.dateTo) {
            xls.name = `Inventory Movement ${moment(new Date(filter.dateFrom)).format(dateFormat)} - ${moment(new Date(filter.dateTo)).format(dateFormat)}.xlsx`;
        }
        else {
            xls.name = `Inventory Movement.xlsx`;
        }

        return Promise.resolve(xls);
    }
}