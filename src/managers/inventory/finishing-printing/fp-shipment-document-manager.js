"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../../utils/code-generator");

var BuyerManager = require('../../master/buyer-manager');
var StorageManager = require('../../master/storage-manager');
var InventoryDocumentManager = require('../inventory-document-manager');

var Models = require("dl-models");
var Map = Models.map;
var FpShipmentDocumentModel = Models.inventory.finishingPrinting.FPShipmentDocument;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class FPPackingShipmentDocumentManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.inventory.finishingPrinting.collection.FPPackingShipmentDocument);

        this.buyerManager = new BuyerManager(db, user);
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
            var codeFilter = {
                "code": {
                    "$regex": regex
                }
            };
            var deliveryDateFilter = {
                "deliveryDate": {
                    "$regex": regex
                }
            };
            var buyerFilter = {
                "buyerName": {
                    "$regex": regex
                }
            };
            var createdByFilter = {
                "_createdBy": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, deliveryDateFilter, buyerFilter, createdByFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _validate(data) {

        var errors = {};
        var valid = data;

        // valid.details = valid.details instanceof Array ? valid.details : [];
        // var items = valid.details.map((detail) => detail.items ? detail.items : null);

        var getDbShipmentDocument = this.collection.singleOrDefault({
            _id: new ObjectId(valid._id)
        });

        var getDuplicateShipmentDocument = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });

        var getBuyer = valid.buyerId && ObjectId.isValid(valid.buyerId) ? this.buyerManager.getSingleByIdOrDefault(valid.buyerId) : Promise.resolve(null);

        var getStorage = valid.details ? this.storageManager.collection.find({ name: "Gudang Jadi Finishing Printing" }).toArray() : Promise.resolve([]);

        return Promise.all([getDbShipmentDocument, getDuplicateShipmentDocument, getBuyer, getStorage])
            .then((results) => {
                var _dbShipmentDocument = results[0];
                var _duplicateShipmentDocument = results[1];
                var _buyer = results[2];
                var _storages = results[3];

                if (_dbShipmentDocument)
                    valid.code = _dbShipmentDocument.code; // prevent code changes.

                if (_duplicateShipmentDocument)
                    errors["code"] = i18n.__("ShipmentDocument.code.isExist: %s is exist", i18n.__("ShipmentDocument.code._:Code"));

                if (!valid.buyerId || valid.buyerId === '')
                    errors["buyerId"] = i18n.__("ShipmentDocument.buyerId.isExists:%s is not exists", i18n.__("ShipmentDocument.buyerId._:Buyer")); //"Grade harus diisi";   
                else if (!_buyer)
                    errors["buyerId"] = i18n.__("ShipmentDocument.buyerId.isRequired: %s not found", i18n.__("ShipmentDocument.buyerId._:Buyer"));

                if (!valid.deliveryDate)
                    errors["deliveryDate"] = i18n.__("ShipmentDocument.deliveryDate.isRequired:%s is required", i18n.__("ShipmentDocument.deliveryDate._:Date")); //"Grade harus diisi";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                //Inventory Document Validation
                valid.storageId = _storages.length > 0 ? new ObjectId(_storages[0]._id) : null;
                valid.storageName = _storages[0].name;
                valid.storageReferenceType = "Pengiriman Barang Gudang Jadi";
                valid.storageType = "OUT";

                if (!valid.stamp) {
                    valid = new FpShipmentDocumentModel(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.inventory.finishingPrinting.collection.FPPackingShipmentDocument}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var codeIndex = {
            name: `ix_${Map.inventory.finishingPrinting.collection.FPPackingShipmentDocument}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    _afterInsert(id) {
        var fpShipmentDocumentId = id;
        return this.getSingleById(id)
            .then((fpShipmentDocument) => {
                var fpShipmentDocument = fpShipmentDocument;
                var insertItems = fpShipmentDocument.details.map((detail) => {
                    var data = {
                        date: fpShipmentDocument.deliveryDate,
                        referenceNo: `RFNO-${fpShipmentDocument.code}`,
                        referenceType: fpShipmentDocument.storageReferenceType,
                        type: fpShipmentDocument.storageType,
                        storageId: fpShipmentDocument.storageId,
                        storageName: fpShipmentDocument.storageName,
                        items: detail.items
                    }
                    return this.inventoryDocumentManager.create(data)
                })
                return Promise.all(insertItems)
                    .then((result) => Promise.resolve(fpShipmentDocumentId))
            })
    }
};
