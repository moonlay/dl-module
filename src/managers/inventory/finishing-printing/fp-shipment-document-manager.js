"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../../utils/code-generator");

var BuyerManager = require('../../master/buyer-manager');
var StorageManager = require('../../master/storage-manager');
var InventoryDocumentManager = require('../inventory-document-manager');
var InventorySummaryManager = require('../inventory-summary-manager');
var PackingReceiptManager = require('./fp-packing-receipt-manager');

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
        this.inventorySummaryManager = new InventorySummaryManager(db, user);
        this.packingReceiptManager = new PackingReceiptManager(db, user);
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
            var createdDateFilter = {
                "_createdDate": {
                    "$regex": regex
                }
            };
            var shipmentNumberFilter = {
                "shipmentNumber": {
                    "$regex": regex
                }
            };
            var deliveryCodeFilter = {
                "deliveryCode": {
                    "$regex": regex
                }
            };
            var productIdentityFilter = {
                "productIdentity": {
                    "$regex": regex
                }
            };
            var buyerFilter = {
                "buyerName": {
                    "$regex": regex
                }
            };
            var buyerCodeFilter = {
                "buyerCode": {
                    "$regex": regex
                }
            };
            var createdByFilter = {
                "_createdBy": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, createdDateFilter, shipmentNumberFilter, deliveryCodeFilter, productIdentityFilter, buyerFilter, buyerCodeFilter, createdByFilter];
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

        valid.details = valid.details || [];

        var packingReceiptIds = [];
        var products = [];
        for (var detail of valid.details) {
            detail.items = detail.items || [];
            for (var item of detail.items) {
                item.packingReceiptItems = item.packingReceiptItems || [];
                packingReceiptIds.push(new ObjectId(item.packingReceiptId));
                for (var product of item.packingReceiptItems) {
                    products.push(product.productCode)
                }
            }
        }

        var getBuyer = valid.buyerId && ObjectId.isValid(valid.buyerId) ? this.buyerManager.getSingleByIdOrDefault(valid.buyerId) : Promise.resolve(null);

        var getPackingReceipts = packingReceiptIds.length > 0 ? this.packingReceiptManager.collection.find({ "_deleted": false, "_id": { "$in": packingReceiptIds } }).toArray() : Promise.resolve([])

        var getInventorySummaries = products.length != 0 ? this.inventorySummaryManager.collection.find({ "_deleted": false, "productCode": { "$in": products }, storageCode: valid.storage ? valid.storage.code : "" }, { "productCode": 1, "quantity": 1, "uom": 1 }).toArray() : Promise.resolve([]);

        return Promise.all([getDbShipmentDocument, getDuplicateShipmentDocument, getBuyer, getPackingReceipts, getInventorySummaries])
            .then((results) => {
                var _dbShipmentDocument = results[0];
                var _duplicateShipmentDocument = results[1];
                var _buyer = results[2];
                var _packingReceipts = results[3];
                var _products = results[4];

                if (_dbShipmentDocument) {
                    valid.code = _dbShipmentDocument.code; // prevent code changes.
                    valid.isVoid = true; //basic unit test update validation
                }

                if (_duplicateShipmentDocument)
                    errors["code"] = i18n.__("ShipmentDocument.code.isExist: %s is exist", i18n.__("ShipmentDocument.code._:Code"));

                if (!valid.buyerId || valid.buyerId === '')
                    errors["buyerId"] = i18n.__("ShipmentDocument.buyerId.isExists:%s is not exists", i18n.__("ShipmentDocument.buyerId._:Buyer")); //"Buyer harus diisi";   
                else if (!_buyer)
                    errors["buyerId"] = i18n.__("ShipmentDocument.buyerId.isRequired: %s not found", i18n.__("ShipmentDocument.buyerId._:Buyer"));

                if (!valid.shipmentNumber || valid.shipmentNumber === "")
                    errors["shipmentNumber"] = i18n.__("ShipmentDocument.shipmentNumber.isRequired:%s is required", i18n.__("ShipmentDocument.shipmentNumber._:NO."));

                if (!valid.storage || valid.storage === '')
                    errors["storage"] = i18n.__("ShipmentDocument.storage.isRequired:%s is required", i18n.__("ShipmentDocument.storage._:Storage")); //"Gudang harus diisi";  

                if (!valid.productIdentity || valid.productIdentity === "")
                    errors["productIdentity"] = i18n.__("ShipmentDocument.productIdentity.isRequired:%s is required", i18n.__("ShipmentDocument.productIdentity._:Kode Produk"));

                if (!valid.deliveryCode || valid.deliveryCode === "")
                    errors["deliveryCode"] = i18n.__("ShipmentDocument.deliveryCode.isRequired:%s is required", i18n.__("ShipmentDocument.deliveryCode._:DO No"));

                if (!valid.deliveryDate || valid.deliveryDate === "")
                    errors["deliveryDate"] = i18n.__("ShipmentDocument.deliveryDate.isRequired:%s is required", i18n.__("ShipmentDocument.deliveryDate._:Delivery Date"));
                else if (new Date(valid.deliveryDate) > new Date())
                    errors["deliveryDate"] = i18n.__("ShipmentDocument.deliveryDate.lessThanToday:%s must be less than or equal today's date", i18n.__("ShipmentDocument.deliveryDate._:Delivery Date"));

                if (valid.details.length > 0) {
                    var detailErrors = [];
                    var detailIndex = 0
                    for (var detail of valid.details) {
                        var detailError = {};

                        //find duplicate production order
                        var duplicateProductionOrder = valid.details.find((validDetail, index) => (validDetail.productionOrderId.toString() === detail.productionOrderId.toString()) && index !== detailIndex);
                        detailIndex++;
                        if (!detail.productionOrderId || detail.productionOrderId === "") {
                            detailError["productionOrderId"] = i18n.__("ShipmentDocument.details.productionOrderId.isRequired:%s is required", i18n.__("ShipmentDocument.details.productionOrderId._:Nomor Order")); //"Nomor Order harus diisi"; 
                        } else if (duplicateProductionOrder) {
                            detailError["productionOrderId"] = i18n.__("ShipmentDocument.details.productionOrderId.isDuplicate:%s is duplicate", i18n.__("ShipmentDocument.details.productionOrderId._:Nomor Order"));
                        }

                        if (detail.items.length > 0) {
                            var itemErrors = [];
                            var itemIndex = 0;

                            for (var item of detail.items) {
                                var itemError = {};

                                //find duplicate packing receipt
                                var duplicatePackingReceipt = detail.items.find((detailItem, index) => (detailItem.packingReceiptId.toString() === item.packingReceiptId.toString()) && index !== itemIndex);
                                itemIndex++;
                                if (!item.packingReceiptId || item.packingReceiptId === "") {
                                    itemError["packingReceiptId"] = i18n.__("ShipmentDocument.details.items.packingReceiptId.isRequired:%s is required", i18n.__("ShipmentDocument.details.items.packingReceiptId._:Penerimaan Packing")); //"Packing Receipt harus diisi"; 
                                } else if (duplicatePackingReceipt) {
                                    itemError["packingReceiptId"] = i18n.__("ShipmentDocument.details.items.packingReceiptId.isDuplicate:%s is duplicate", i18n.__("ShipmentDocument.details.items.packingReceiptId._:Penerimaan Packing"));
                                }

                                if (item.packingReceiptItems.length > 0 && !valid.isVoid) {
                                    var packingReceiptItemErrors = [];

                                    for (var packingReceiptItem of item.packingReceiptItems) {
                                        var packingReceiptItemError = {};

                                        var productInvSummary = _products.find((product) => product.productCode === packingReceiptItem.productCode && product.uom === packingReceiptItem.uomUnit);

                                        if (productInvSummary && (!packingReceiptItem.quantity || packingReceiptItem.quantity <= 0)) {
                                            packingReceiptItemError["quantity"] = i18n.__("ShipmentDocument.details.items.packingReceiptItems.quantity.mustBeGreater:%s must be greater than zero", i18n.__("ShipmentDocument.details.items.packingReceiptItems.quantity._:Quantity")); //"Kuantitas harus lebih besar dari 0";
                                        }
                                        else if (productInvSummary && (packingReceiptItem.quantity > productInvSummary.quantity)) {
                                            packingReceiptItemError["quantity"] = i18n.__("ShipmentDocument.details.items.packingReceiptItems.quantity.mustBeLessEqual:%s must be less than or equal to stock", i18n.__("ShipmentDocument.details.items.packingReceiptItems.quantity._:Quantity")); //"Kuantitas harus lebih kecil atau sama dengan stock";
                                        }

                                        packingReceiptItemErrors.push(packingReceiptItemError);
                                    }

                                    for (var packingReceiptItemError of packingReceiptItemErrors) {
                                        if (Object.getOwnPropertyNames(packingReceiptItemError).length > 0) {
                                            itemError.packingReceiptItems = packingReceiptItemErrors;
                                            break;
                                        }
                                    }
                                } else if (item.packingReceiptItems.length <= 0) {
                                    itemError["packingReceiptId"] = i18n.__("ShipmentDocument.details.items.packingReceiptItems.isRequired:%s is required", i18n.__("ShipmentDocument.details.items.packingReceiptItems._:Item Penerimaan Packing"));
                                }

                                itemErrors.push(itemError);
                            }

                            for (var itemError of itemErrors) {
                                if (Object.getOwnPropertyNames(itemError).length > 0) {
                                    detailError.items = itemErrors;
                                    break;
                                }
                            }
                        }
                        else {
                            detailError["items"] = i18n.__("ShipmentDocument.details.items.isRequired:%s is required", i18n.__("ShipmentDocument.details.items._:Packing Receipt")); //"Harus ada item"; 
                        }

                        detailErrors.push(detailError);
                    }

                    for (var detailError of detailErrors) {
                        if (Object.getOwnPropertyNames(detailError).length > 0) {
                            errors.details = detailErrors;
                            break;
                        }
                    }
                }
                else {
                    errors["detail"] = i18n.__("ShipmentDocument.detail.isRequired:%s is required", i18n.__("ShipmentDocument.detail._:Detail")); //"Detail harus diisi";  
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                //Inventory Document Validation
                valid.storageId = valid.storage && ObjectId.isValid(valid.storage._id) ? new ObjectId(valid.storage._id) : null
                valid.storageReferenceType = `Penerimaan Packing ${valid.storage ? valid.storage.name : null}`;
                valid.storageName = valid.storage && valid.storage.name ? valid.storage.name : null;
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
                var shipmentItems = [];
                var insertItems = [];

                for (var detail of fpShipmentDocument.details) {
                    for (var item of detail.items) {
                        var items = [];
                        for (var packingReceiptItem of item.packingReceiptItems) {
                            var _item = {};
                            _item.productId = packingReceiptItem.productId;
                            _item.quantity = packingReceiptItem.quantity;
                            _item.uomId = packingReceiptItem.uomId;

                            items.push(_item);
                        }

                        var data = {
                            code: generateCode(detail.productionOrderId.toString()),
                            date: fpShipmentDocument._createdDate,
                            referenceNo: `RFNO-${fpShipmentDocument.code}`,
                            referenceType: fpShipmentDocument.storageReferenceType,
                            type: fpShipmentDocument.storageType,
                            storageId: fpShipmentDocument.storageId,
                            storageName: fpShipmentDocument.storageName,
                            items: items
                        }
                        shipmentItems.push(item);
                        insertItems.push(this.inventoryDocumentManager.create(data));
                    }
                }
                return Promise.all(insertItems)
                    .then((result) => {
                        var packingReceiptIds = shipmentItems.map((shipmentItem) => {
                            return new ObjectId(shipmentItem.packingReceiptId);
                        });
                        var query = {
                            "_deleted": false,
                            "_id": {
                                "$in": packingReceiptIds
                            }
                        };

                        return this.packingReceiptManager.collection.find(query)
                            .toArray()
                            .then((packingReceipts) => {
                                var updatePackingReceipts = [];

                                for (var i = 0; i < packingReceipts.length; i++) {
                                    var shipmentPackingReceipt = shipmentItems.find((shipmentItem) => shipmentItem.packingReceiptId.toString() === packingReceipts[i]._id.toString());
                                    for (var j = 0; j < packingReceipts[i].items.length; j++) {
                                        var shipmentPackingReceiptItem = shipmentPackingReceipt.packingReceiptItems.find((packingReceiptItem) => packingReceiptItem.productName.toString() === packingReceipts[i].items[j].product.toString());

                                        if (shipmentPackingReceipt && shipmentPackingReceiptItem) {
                                            packingReceipts[i].items[j].availableQuantity -= shipmentPackingReceiptItem.quantity;
                                        }
                                        if (shipmentPackingReceipt && shipmentPackingReceiptItem && packingReceipts[i].items[j].availableQuantity === 0) {
                                            packingReceipts[i].items[j].isDelivered = true;
                                        }

                                    }

                                    updatePackingReceipts.push(this.packingReceiptManager.update(packingReceipts[i]));
                                }

                                return Promise.all(updatePackingReceipts)
                                    .then((results) => Promise.resolve(fpShipmentDocumentId))
                            })
                    })
            })
    }

    _afterUpdate(id) {
        var fpShipmentDocumentId = id;
        return this.getSingleById(id)
            .then((fpShipmentDocument) => {
                var fpShipmentDocument = fpShipmentDocument;
                var shipmentItems = [];
                var insertItems = [];

                for (var detail of fpShipmentDocument.details) {
                    for (var item of detail.items) {
                        var data = {
                            code: generateCode(detail.productionOrderId.toString()),
                            date: fpShipmentDocument._createdDate,
                            referenceNo: `RFNO-${fpShipmentDocument.code}`,
                            referenceType: fpShipmentDocument.storageReferenceType,
                            type: "IN",
                            storageId: fpShipmentDocument.storageId,
                            storageName: fpShipmentDocument.storageName,
                            items: item.packingReceiptItems
                        }
                        shipmentItems.push(item);
                        insertItems.push(this.inventoryDocumentManager.create(data));
                    }
                }
                return Promise.all(insertItems)
                    .then((result) => {
                        var packingReceiptIds = shipmentItems.map((shipmentItem) => {
                            return shipmentItem.packingReceiptId;
                        });
                        var query = {
                            "_deleted": false,
                            "_id": {
                                "$in": packingReceiptIds
                            }
                        };

                        return this.packingReceiptManager.collection.find(query)
                            .toArray()
                            .then((packingReceipts) => {
                                var updatePackingReceipts = [];

                                for (var i = 0; i < packingReceipts.length; i++) {
                                    var shipmentPackingReceipt = shipmentItems.find((shipmentItem) => shipmentItem.packingReceiptId.toString() === packingReceipts[i]._id.toString());
                                    for (var j = 0; j < packingReceipts[i].items.length; j++) {
                                        var shipmentPackingReceiptItem = shipmentPackingReceipt.packingReceiptItems.find((packingReceiptItem) => packingReceiptItem.productName.toString() === packingReceipts[i].items[j].product.toString());

                                        if (shipmentPackingReceipt && shipmentPackingReceiptItem) {
                                            packingReceipts[i].items[j].availableQuantity += shipmentPackingReceiptItem.quantity;
                                        }
                                        if (shipmentPackingReceipt && shipmentPackingReceiptItem && packingReceipts[i].items[j].availableQuantity !== 0) {
                                            packingReceipts[i].items[j].isDelivered = false;
                                        }

                                    }

                                    updatePackingReceipts.push(this.packingReceiptManager.update(packingReceipts[i]));
                                }

                                return Promise.all(updatePackingReceipts)
                                    .then((results) => Promise.resolve(fpShipmentDocumentId))
                            })
                    })
            })
    }

    getPdf(data) {
        return new Promise((resolve, reject) => {
            var getDefinition = require("../../../pdf/definitions/fp-shipment-document");
            var definition = getDefinition(data);

            var generatePdf = require("../../../pdf/pdf-generator");
            generatePdf(definition)
                .then((binary) => {
                    resolve(binary);
                })
                .catch((e) => {
                    reject(e);
                });
        })
    }

    getShipmentReport(info) {
        var _defaultFilter = {
            _deleted: false,
            isVoid: false
        };
        var shipmentNumberFilter = {};
        var deliveryCodeFilter = {};
        var productIdentityFilter = {};
        var buyerFilter = {};
        var productionOrderFilter = {};
        var dateFromFilter = {};
        var dateToFilter = {};
        var query = {};

        var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
        var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59")) : (new Date());
        var now = new Date();

        if (info.shipmentNumber && info.shipmentNumber != '') {
            shipmentNumberFilter = { "shipmentNumber": info.shipmentNumber };
        }

        if (info.deliveryCode && info.deliveryCode != '') {
            deliveryCodeFilter = { "deliveryCode": info.deliveryCode };
        }

        if (info.productIdentity && info.productIdentity != '') {
            productIdentityFilter = { "productIdentity": info.productIdentity };
        }

        if (info.buyerId && info.buyerId != '') {
            buyerFilter = { "buyerId": new ObjectId(info.buyerId) };
        }

        if (info.productionOrderNo && info.productionOrderNo != '') {
            productionOrderFilter = { "details.productionOrderNo": info.productionOrderNo };
        }

        var filterDate = {
            "_createdDate": {
                $gte: new Date(dateFrom),
                $lte: new Date(dateTo)
            }
        };

        query = { '$and': [_defaultFilter, shipmentNumberFilter, deliveryCodeFilter, productIdentityFilter, buyerFilter, productionOrderFilter, filterDate] };

        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(query)
                    .execute();
            });
    }

    getXls(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for (var shipment of result.data) {

            for (var detail of shipment.details) {

                for (var field of detail.items) {

                    var item = {};
                    index += 1;
                    item["No"] = index;
                    item["Tanggal"] = shipment._createdDate ? moment(new Date(shipment._createdDate)).format(dateFormat) : '';
                    item["Kode"] = shipment.code ? shipment.code : '';
                    item["Kode Pengiriman"] = shipment.shipmentNumber ? shipment.shipmentNumber : '';
                    item["Kode Delivery Order"] = shipment.deliveryCode ? shipment.deliveryCode : '';
                    item["Nomor Order"] = detail.productionOrderNo ? detail.productionOrderNo : '';
                    item["Buyer"] = shipment.buyerName ? shipment.buyerName : '';
                    item["Nama Barang"] = field.productName ? field.productName : '';
                    item["Satuan"] = field.uomUnit ? field.uomUnit : '';
                    item["Kuantiti Satuan"] = field.quantity ? field.quantity : 0;
                    item["Panjang Total"] = field.length ? (field.length * field.quantity).toFixed(2) : 0;
                    item["Berat Total"] = field.weight ? (field.weight * field.quantity).toFixed(2) : 0;

                    xls.options["No"] = "number";
                    xls.options["Tanggal"] = "string";
                    xls.options["Kode"] = "string";
                    xls.options["Kode Pengiriman"] = "string";
                    xls.options["Kode Delivery Order"] = "string";
                    xls.options["Nomor Order"] = "string";
                    xls.options["Buyer"] = "string";
                    xls.options["Nama Barang"] = "string";
                    xls.options["Satuan"] = "string";
                    xls.options["Kuantiti Satuan"] = "number";
                    xls.options["Panjang Total"] = "number";
                    xls.options["Berat Total"] = "number";

                    xls.data.push(item);

                }

            }

        }

        if (query.dateFrom && query.dateTo) {
            xls.name = `Shipment Document ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Shipment Document ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Shipment Document ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Shipment Document.xlsx`;

        return Promise.resolve(xls);
    }
};