"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../../utils/code-generator");

var PackingManager = require('../../production/finishing-printing/packing-manager');
var ProductionOrderManager = require('../../sales/production-order-manager');
var ProductManager = require('../../master/product-manager');
var UomManager = require('../../master/uom-manager');
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
        this.productionOrderManager = new ProductionOrderManager(db, user);
        this.productManager = new ProductManager(db, user);
        this.uomManager = new UomManager(db, user);
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

    _pre(data) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this.checkUncreatedProducts(data);
            })
            .then((data) => {
                return this._validate(data)
            })
    }

    checkUncreatedProducts(data) {
        data.items = data.items || [];
        var index = 0;
        var createProducts = data.items.length > 0 ? data.items.map((dataItem) => { //checking for not exist products
            return this.packingManager.getSingleById(data.packingId)
                .then((packing) => {
                    var packingItems = packing.items;
                    return this.productionOrderManager.getSingleById(packing.productionOrderId)
                        .then((productionOrder) => {
                            var uomQuery = {
                                _deleted: false,
                                unit: packing.packingUom
                            }
                            return this.uomManager.getSingleByQueryOrDefault(uomQuery)
                                .then((uom) => {
                                    var productQuery = {
                                        _deleted: false,
                                        name: dataItem.product
                                    }
                                    return this.productManager.getSingleByQueryOrDefault(productQuery)
                                        .then((product) => {
                                            if (!product) {
                                                var packingItem = packingItems.find((item) => item.remark !== "" && item.remark !== null ? `${productionOrder.orderNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}/${item.length}/${item.remark}` : `${productionOrder.orderNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}/${item.length}` === dataItem.product)
                                                var packingProduct = {
                                                    code: generateCode(dataItem.product + index++),
                                                    currency: {},
                                                    description: "",
                                                    name: dataItem.product,
                                                    price: 0,
                                                    properties: {
                                                        productionOrderId: productionOrder._id,
                                                        productionOrderNo: productionOrder.orderNo,
                                                        designCode: productionOrder.designCode ? productionOrder.designCode : "",
                                                        designNumber: productionOrder.designNumber ? productionOrder.designNumber : "",
                                                        orderType: productionOrder.orderType,
                                                        buyerId: packing.buyerId,
                                                        buyerName: packing.buyerName,
                                                        buyerAddress: packing.buyerAddress,
                                                        colorName: packing.colorName,
                                                        construction: packing.construction,
                                                        lot: packingItem.lot,
                                                        grade: packingItem.grade,
                                                        weight: packingItem.weight,
                                                        length: packingItem.length
                                                    },
                                                    tags: `sales contract #${productionOrder.salesContractNo}`,
                                                    uom: uom,
                                                    uomId: uom._id
                                                }
                                                return this.productManager.create(packingProduct);
                                            } else {
                                                return Promise.resolve(data)
                                            }
                                        })
                                })
                        })
                })
        }) : [];
        return Promise.all(createProducts)
            .then((results) => {
                return Promise.resolve(data)
            })
    }

    // _beforeInsert(data) {
    //     data.code = generateCode();
    //     return Promise.resolve(data);
    // }

    _validate(packingReceipt) {
        var errors = {};
        var valid = packingReceipt;

        valid.code = generateCode();

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

        // var storageName = valid.storageName ? valid.storageName : null;
        // var storageId = valid.storageId ? new ObjectId(valid.storageId) : null;

        // var getStorage = valid.storageName || valid.storageId ? this.storageManager.collection.find({ "$or": [{ "name": storageName }, { "_id": storageId }] }).toArray() : Promise.resolve([]);

        valid.items = valid.items instanceof Array ? valid.items : [];
        var products = valid.items.map((item) => item.product ? item.product : null);
        var getProducts = products.length > 0 ? this.productManager.collection.find({ name: { "$in": products } }).toArray() : Promise.resolve([]);

        // return Promise.all([getDbPackingReceipt, getDuplicatePackingReceipt, getPacking, getStorage, getProducts])
        return Promise.all([getDbPackingReceipt, getDuplicatePackingReceipt, getPacking, getProducts])
            .then((results) => {
                var _dbPackingReceipt = results[0];
                var _duplicatePackingReceipt = results[1];
                var _packing = results[2];
                // var _storage = results[3].length > 0 ? results[3][0] : null;
                var _products = results[3];

                if (_dbPackingReceipt)
                    valid.code = _dbPackingReceipt.code; // prevent code changes.

                if (_duplicatePackingReceipt)
                    errors["code"] = i18n.__("PackingReceipt.code.isExist: %s is exist", i18n.__("PackingReceipt.code._:Code"));

                if (!valid.packingId || valid.packingId === '')
                    errors["packingId"] = i18n.__("PackingReceipt.packingId.isRequired:%s is required", i18n.__("PackingReceipt.packingId._:Packing")); //"Grade harus diisi";   
                else if (!_packing)
                    errors["packingId"] = i18n.__("PackingReceipt.packingId: %s not found", i18n.__("PackingReceipt.KanbanId._:Packing"));

                if (!valid.storage || valid.storage === '')
                    errors["storage"] = i18n.__("PackingReceipt.storage.isRequired:%s is required", i18n.__("PackingReceipt.storage._:Storage")); //"Gudang harus diisi";  

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
                valid.storageId = valid.storage && ObjectId.isValid(valid.storage._id) ? new ObjectId(valid.storage._id) : null;
                valid.referenceNo = `RFNO-${valid.code}`;
                valid.referenceType = `Penerimaan Packing ${valid.storage ? valid.storage.name : null}`;
                valid.type = "IN";

                for (var i = 0; i < valid.items.length; i++) {
                    var product = _products.find((_product) => _product.name.toString().toLowerCase() === valid.items[i].product.toString().toLowerCase())
                    valid.items[i].uomId = product.uomId;
                    valid.items[i].productId = product._id;
                }

                valid.buyer = _packing.buyerName;
                valid.date = new Date(valid.date);
                valid.productionOrderNo = _packing.productionOrderNo;
                valid.colorName = _packing.colorName;
                valid.construction = _packing.construction;
                valid.packingUom = _packing.packingUom;
                valid.finishWidth = _packing.materialWidthFinish;

                valid.orderType = _packing.orderType;
                valid.colorType = _packing.colorType;
                valid.designCode = _packing.designCode;
                valid.designNumber = _packing.designNumber;

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
                                var inventoryDocument = {
                                    referenceNo: `RFNO-${packingReceipt.code}`,
                                    referenceType: `Penerimaan Packing ${packingReceipt.storage ? packingReceipt.storage.name : null}`,
                                    type: "IN",
                                    date: new Date(),
                                    storageId: packingReceipt.storageId,
                                    items: packingReceipt.items
                                }
                                return this.inventoryDocumentManager.create(inventoryDocument)
                                    .then((inventoryDocumentId) => Promise.resolve(packingReceiptId))
                            })
                    })
            })
    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((packingReceipt) => {
                var packingReceiptId = id;
                if (packingReceipt.isVoid) {
                    return this.packingManager.getSingleById(packingReceipt.packingId)
                    .then((packing) => {
                        packing.accepted = false;
                        return this.packingManager.update(packing)
                            .then((id) => {
                                var inventoryDocument = {
                                    referenceNo: `RFNO-${packingReceipt.code}`,
                                    referenceType: `Penerimaan Packing ${packingReceipt.storage ? packingReceipt.storage.name : null}`,
                                    type: "OUT",
                                    remark: "VOID PACKING RECEIPT",
                                    date: new Date(),
                                    storageId: packingReceipt.storageId,
                                    items: packingReceipt.items
                                }
                                return this.inventoryDocumentManager.create(inventoryDocument)
                                    .then((inventoryDocumentId) => Promise.resolve(packingReceiptId))
                            })
                    })
                } else {
                    return Promise.resolve(packingReceiptId)
                }
            })
    }

    getReport(info) {
        var _defaultFilter = {
            _deleted: false
        };
        var query = {};

        var packingCodeFilter = {};
        var buyerFilter = {};
        var productionOrderNoFilter = {};
        var _createdByFilter = {};

        var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
        var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59")) : (new Date());

        if (info.packingCode && info.packingCode !== "") {
            packingCodeFilter = { "packingCode": info.packingCode };
        }

        if (info.buyer && info.buyer !== "") {
            buyerFilter = { "buyer": info.buyer };
        }

        if (info.productionOrderNo && info.productionOrderNo !== "") {
            productionOrderNoFilter = { "productionOrderNo": info.productionOrderNo };
        }

        if (info._createdBy && info._createdBy !== "") {
            _createdByFilter = { "_createdBy": info._createdBy };
        }

        var dateFilter = {
            "date": {
                $gte: new Date(dateFrom),
                $lte: new Date(dateTo)
            }
        };

        query = { "$and": [_defaultFilter, packingCodeFilter, buyerFilter, productionOrderNoFilter, _createdByFilter, dateFilter] }

        return this._createIndexes()
            .then((createdIndexResults) => {
                return this.collection
                    .where(query)
                    .execute();
            })
    }

    getXls(results, query) {
        var xls = [];
        xls.data = [];
        xls.options = [];
        xls.name = "";

        var index = 1;
        var dateFormat = "DD/MM/YYYY";

        for (var result of results.data) {
            if (result.items) {
                for (var item of result.items) {
                    var detail = {};
                    detail["No"] = index;
                    detail["Kode Paking"] = result.packingCode ? result.packingCode : "";
                    detail["Tanggal"] = result.date ? moment(result.date).format(dateFormat) : "";
                    detail["Buyer"] = result.buyer ? result.buyer : "";
                    detail["Nomor Order"] = result.productionOrderNo ? result.productionOrderNo : "";
                    detail["Warna"] = result.colorName ? result.colorName : "";
                    detail["Konstruksi"] = result.construction ? result.construction : "";
                    detail["Diterima Oleh"] = result._createdBy ? result._createdBy : "";
                    detail["UOM"] = result.packingUom ? result.packingUom : "";
                    detail["Nama Barang"] = item.product ? item.product : "";
                    detail["Kuantiti Diterima"] = item.quantity ? item.quantity : 0;
                    detail["Remark"] = item.remark ? item.remark : "";
                    detail["Catatan"] = item.notes ? item.notes : "";

                    xls.options["No"] = "number";
                    xls.options["Kode Paking"] = "string";
                    xls.options["Tanggal"] = "string";
                    xls.options["Buyer"] = "string";
                    xls.options["Nomor Order"] = "string";
                    xls.options["Warna"] = "string";
                    xls.options["Konstruksi"] = "string";
                    xls.options["Diterima Oleh"] = "string";
                    xls.options["UOM"] = "string";
                    xls.options["Nama Barang"] = "string";
                    xls.options["Kuantiti Diterima"] = "number";
                    xls.options["Remark"] = "string";
                    xls.options["Catatan"] = "string";

                    index++;
                    xls.data.push(detail);
                }
            }
        }

        if (query.dateFrom && query.dateTo) {
            xls.name = `Laporan Penerimaan Packing ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`
        } else if (!query.dateFrom && query.dateTo) {
            xls.name = `Laporan Penerimaan Packing ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`
        } else if (query.dateFrom && !query.dateTo) {
            xls.name = `Laporan Penerimaan Packing ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`
        } else {
            xls.name = `Laporan Penerimaan Packing.xlsx`;
        }

        return Promise.resolve(xls);
    }
};
