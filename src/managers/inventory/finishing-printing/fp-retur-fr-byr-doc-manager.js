"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../../utils/code-generator");

var ProductManager = require('../../master/product-manager');
var StorageManager = require('../../master/storage-manager');
var BuyerManager = require('../../master/buyer-manager');
var UomManager = require('../../master/uom-manager');
var MaterialConstructionManager = require('../../master/material-construction-manager');
var InventoryDocumentManager = require('../inventory-document-manager');
var ProductionOrderManager = require('../../sales/production-order-manager');
var ShipmentDocManager = require('./fp-shipment-document-manager');

var Models = require("dl-models");
var Map = Models.map;
var FPReturFromBuyerDoc = Models.inventory.finishingPrinting.FPReturFromBuyerDoc;
var FPReturFromBuyerDocDetail = Models.inventory.finishingPrinting.FPReturFromBuyerDocDetail;
var FPReturFromBuyerDocItem = Models.inventory.finishingPrinting.FPReturFromBuyerDocItem;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class FPReturFrByrDocManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.inventory.finishingPrinting.collection.FPReturFromBuyerDoc);

        this.productManager = new ProductManager(db, user);
        this.storageManager = new StorageManager(db, user);
        this.buyerManager = new BuyerManager(db, user);
        this.uomManager = new UomManager(db, user);
        this.materialConstructionManager = new MaterialConstructionManager(db, user);
        this.inventoryDocumentManager = new InventoryDocumentManager(db, user);
        this.productionOrderManager = new ProductionOrderManager(db, user);
        this.shipmentDocManager = new ShipmentDocManager(db, user);
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
            var destinationFilter = {
                "destination": {
                    "$regex": regex
                }
            };
            var buyerFilter = {
                "buyer.name": {
                    "$regex": regex
                }
            };
            var spkFilter = {
                "spk": {
                    "$regex": regex
                }
            };
            var coverLetterFilter = {
                "coverLetter": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, destinationFilter, buyerFilter, spkFilter, coverLetterFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = data.code ? data.code : generateCode();
        return Promise.resolve(data);
    }

    addProduct(product) {
        return new Promise((resolve, reject) => {
            this.productManager.create(product)
                .then(id => {
                    this.productManager.getSingleByIdOrDefault(id)
                        .then(data => {
                            resolve(data);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _validate(retur) {
        var errors = {};
        var dateNow = new Date();
        return new Promise((resolve, reject) => {
            var valid = retur;

            var getReturDoc = this.collection.singleOrDefault({
                _id: {
                    '$ne': new ObjectId(valid._id)
                },
                returNo: valid.returNo
            });
            var spp = [];
            var product = [];
            var uom = [];
            var construction = [];
            if (valid && valid.details) {
                for (var detail of valid.details) {
                    var sppNo = detail && detail.productionOrderNo ? detail.productionOrderNo : '';
                    spp.push(sppNo);
                    if (detail.items && detail.items.length > 0) {
                        for (var item of detail.items) {
                            var productCode = item.productCode ? item.productCode : '';
                            var uomUnit = item.uom ? item.uom : '';
                            product.push(productCode);
                            uom.push(uomUnit);
                        }
                    }
                    if (detail.newProducts && detail.newProducts.length > 0) {
                        for (var newProduct of detail.newProducts) {
                            var uomUnit = newProduct.uom ? newProduct.uom : '';
                            var constructionCode = newProduct.construction ? newProduct.construction : '';
                            uom.push(uomUnit);
                            construction.push(constructionCode);
                        }
                    }
                }
            }
            var getSPP = spp.length > 0 ? this.productionOrderManager.collection.find({ "orderNo": { "$in": spp } }).toArray() : Promise.resolve([]);
            var getProduct = product.length > 0 ? this.productManager.collection.find({ "code": { "$in": product } }).toArray() : Promise.resolve([]);
            var getProductShipment = spp.length > 0 ? this.getProductShipmentByPO(spp, (valid && valid.buyerId ? valid.buyerId : '')) : Promise.resolve([]);
            var getUom = uom.length > 0 ? this.uomManager.collection.find({ "unit": { "$in": uom } }).toArray() : Promise.resolve([]);
            var getConstruction = construction.length > 0 ? this.materialConstructionManager.collection.find({ "code": { "$in": construction } }).toArray() : Promise.resolve([]);
            var getBuyer = valid.buyerId && ObjectId.isValid(valid.buyerId) ? this.buyerManager.getSingleByIdOrDefault(new ObjectId(valid.buyerId)) : Promise.resolve(null);
            var getStorage = valid.storageId && ObjectId.isValid(valid.storageId) ? this.storageManager.getSingleByIdOrDefault(new ObjectId(valid.storageId)) : Promise.resolve(null);
            Promise.all([getSPP, getProduct, getProductShipment, getUom, getBuyer, getConstruction, getStorage])
                .then(results => {
                    var _spp = results[0];
                    var _product = results[1];
                    var _ProductShipment = results[2];
                    var _uom = results[3];
                    var _buyer = results[4];
                    var _construction = results[5];
                    var _storage = results[6];

                    if (!valid.destination || valid.destination === "")
                        errors["destination"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.destination._:Destination")); //nomor Beacukai harus diisi

                    if (!valid.buyerId || valid.buyerId === "")
                        errors["buyer"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.buyer._:Buyer")); //nomor Beacukai harus diisi
                    else if (!_buyer)
                        errors["buyer"] = i18n.__("Data Supplier tidak ditemukan", i18n.__("FPReturFromBuyerDoc.buyer._:Buyer"));

                    if (!valid.date || valid.date === "")
                        errors["date"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.date._:Date")); //nomor Beacukai harus diisi
                    else {
                        var returDate = new Date(valid.date);
                        if (returDate > dateNow)
                            errors["date"] = i18n.__("Tidak boleh lebih dari tanggal hari ini", i18n.__("FPReturFromBuyerDoc.date._:Date")); //nomor Beacukai harus diisi
                    }

                    if(!valid.storageId || valid.storageId === "")
                        errors["storage"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.storage._:Storage"));
                    else if(!_storage)
                        errors["storage"] = i18n.__("Data gudang tidak ditemukan", i18n.__("FPReturFromBuyerDoc.storage._:Storage"));

                    // if(!valid.spk || valid.spk === "")
                    //     errors["spk"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.spk._:Spk")); //nomor Beacukai harus diisi

                    // if(!valid.coverLetter || valid.coverLetter === "")
                    //     errors["coverLetter"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.coverLetter._:CoverLetter")); //nomor Beacukai harus diisi

                    // if(!valid.codeProduct || valid.codeProduct === "")
                    //     errors["codeProduct"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.codeProduct._:CodeProduct")); //nomor Beacukai harus diisi

                    if (valid.details && valid.details.length > 0) {
                        var detailErrors = [];
                        for (var detail of valid.details) {
                            var detailError = {};
                            if (!detail.productionOrderNo && detail.productionOrderNo === "")
                                detailError["productionOrderNo"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.productionOrderNo._:ProductionOrderNo"));
                            else {
                                var productionOrderExist = _spp.find(productionOrder => productionOrder.orderNo === detail.productionOrderNo);
                                // var shipmentExist = _shipment.find(shipment => shipment.code === detail.shipmentCode);
                                // if(!shipmentExist)
                                //     detailError["productionOrderNo"] = i18n.__("Data Surat Perintah Produksi tidak ditemukan", i18n.__("FPReturFromBuyerDoc.details.productionOrderNo._:ProductionOrderNo"));
                                if (!productionOrderExist)
                                    detailError["productionOrderNo"] = i18n.__("Data Surat Perintah Produksi tidak ditemukan", i18n.__("FPReturFromBuyerDoc.details.productionOrderNo._:ProductionOrderNo"));
                            }

                            if (!detail.items && !detail.newProducts)
                                detailError["dataItems"] = i18n.__("Data Produk harus diisi minimal 1", i18n.__("FPReturFromBuyerDoc.details.dataItems._:DataItems"));
                            if (detail.items && detail.items.length === 0 && !detail.newProducts)
                                detailError["dataItems"] = i18n.__("Data Produk harus diisi minimal 1", i18n.__("FPReturFromBuyerDoc.details.dataItems._:DataItems"));
                            if (detail.items && detail.items.length === 0 && detail.newProducts && detail.newProducts.length === 0)
                                detailError["dataItems"] = i18n.__("Data Produk harus diisi minimal 1", i18n.__("FPReturFromBuyerDoc.details.dataItems._:DataItems"));
                            // if(detail.items && detail.items.length > 0 && detail.newProducts && detail.newProducts.length === 0)
                            //     detailError["dataItems"] = i18n.__("Data Produk Baru harus diisi minimal 1", i18n.__("FPReturFromBuyerDoc.details.dataItems._:DataItems"));
                            else {
                                if (detail.items && detail.items.length > 0) {
                                    var itemErrors = [];
                                    var isItems = false;
                                    for (var item of detail.items) {
                                        var itemError = {};
                                        if (item.returQuantity && item.returQuantity > 0) {
                                            isItems = true;
                                            if (!item.remark || item.remark === "")
                                                itemError["remark"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.items.remark._:Remark"));

                                            if (!item.length || item.length === "")
                                                itemError["length"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.items.length._:Length"));
                                            else if (item.length === 0)
                                                itemError["length"] = i18n.__("Harus lebih dari 0", i18n.__("FPReturFromBuyerDoc.details.items.length._:Length"));

                                            // if(!item.weight || item.weight === "")
                                            //     itemError["weight"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.items.weight._:Weight"));
                                            // else if(item.length === 0)
                                            //     itemError["weight"] = i18n.__("Harus lebih dari 0", i18n.__("FPReturFromBuyerDoc.details.items.weight._:Weight"));

                                            var productExist = _product.find(data => data.code === item.productCode);
                                            var productShipment = _ProductShipment.find(data => data._id.productionOrderNo === detail.productionOrderNo && data._id.productCode === item.productCode && data._id.buyerId.toString() === (_buyer ? _buyer._id.toString() : ''));
                                            if (!productExist)
                                                itemError["productName"] = i18n.__("Data Produk tidak ditemukan", i18n.__("FPReturFromBuyerDoc.details.items.productName._:ProductName"));
                                            else if (!productShipment && !item.hasNewProduct)
                                                itemError["productName"] = i18n.__("Tidak ada pengiriman untuk produk ini", i18n.__("FPReturFromBuyerDoc.details.items.productName._:ProductName"));
                                        }
                                        itemErrors.push(itemError);
                                    }
                                    for (var itemError of itemErrors) {
                                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                                            detailError["items"] = itemErrors;
                                            break;
                                        }
                                    }
                                }
                                if (detail.newProducts && detail.newProducts.length > 0) {
                                    var newProductErrors = [];
                                    for (var newProduct of detail.newProducts) {
                                        var newProductError = {};
                                        if (!newProduct.remark || newProduct.remark === "")
                                            newProductError["remark"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.newProducts.remark._:Remark"));

                                        if (!newProduct.length || newProduct.length === "")
                                            newProductError["length"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.newProducts.length._:Length"));
                                        else if (newProduct.length === 0)
                                            newProductError["length"] = i18n.__("Harus lebih dari 0", i18n.__("FPReturFromBuyerDoc.details.newProducts.length._:Length"));

                                        // if(!newProduct.weight || newProduct.weight === "")
                                        //     newProductError["weight"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.newProducts.weight._:Weight"));
                                        // else if(newProduct.length === 0)
                                        //     newProductError["weight"] = i18n.__("Harus lebih dari 0", i18n.__("FPReturFromBuyerDoc.details.newProducts.weight._:Weight"));
                                        // //

                                        if (!newProduct.productName || newProduct.productName === "")
                                            newProductError["productName"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.newProducts.productName._:ProductName"));

                                        if (!newProduct.lot || newProduct.lot === "")
                                            newProductError["lot"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.newProducts.lot._:Lot"));

                                        if (!newProduct.grade || newProduct.grade === "")
                                            newProductError["grade"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.newProducts.grade._:Grade"));

                                        if (!newProduct.description || newProduct.description === "")
                                            newProductError["description"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.newProducts.description._:Description"));

                                        if (!newProduct.uom || newProduct.uom === "")
                                            newProductError["uom"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.newProducts.uom._:Uom"));
                                        else {
                                            var uomExist = _uom.find(data => data.unit === newProduct.uom);
                                            if (!uomExist)
                                                newProductError["uom"] = i18n.__("Data Satuan tidak ditemukan", i18n.__("FPReturFromBuyerDoc.details.newProducts.uom._:Uom"));
                                        }

                                        if (!newProduct.construction || newProduct.construction === "")
                                            newProductError["construction"] = i18n.__("Harus diisi", i18n.__("FPReturFromBuyerDoc.details.newProducts.construction._:Construction"));
                                        else {
                                            var constructionExist = _construction.find(data => data.code === newProduct.construction);
                                            if (!constructionExist)
                                                newProductError["construction"] = i18n.__("Data Material Konstruksi tidak ditemukan", i18n.__("FPReturFromBuyerDoc.details.newProducts.construction._:Construction"));
                                        }
                                        newProductErrors.push(newProductError);
                                    }
                                    for (var newProductError of newProductErrors) {
                                        if (Object.getOwnPropertyNames(newProductError).length > 0) {
                                            detailError["newProducts"] = newProductErrors;
                                            break;
                                        }
                                    }
                                }
                                else if (!isItems) {
                                    detailError["dataItems"] = i18n.__("Data Produk harus diisi minimal 1", i18n.__("FPReturFromBuyerDoc.details.dataItems._:DataItems"));
                                }
                            }
                            detailErrors.push(detailError);
                        }
                        for (var detailError of detailErrors) {
                            if (Object.getOwnPropertyNames(detailError).length > 0) {
                                errors["details"] = detailErrors;
                                break;
                            }
                        }
                    }
                    else errors["dataDetails"] = i18n.__("Data Surat Perintah Produksi harus diisi minimal 1", i18n.__("FPReturFromBuyerDoc.dataDetails._:DataDetails"));

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require("module-toolkit").ValidationError;
                        return Promise.reject(new ValidationError("data does not pass validation", errors));
                    }

                    var addNewProduct = [];
                    for (var detail of valid.details) {
                        var productionOrderExist = _spp.find(productionOrder => productionOrder.orderNo === detail.productionOrderNo);
                        if (detail.newProducts && detail.newProducts.length > 0) {
                            for (var dataProduct of detail.newProducts) {
                                var uomExist = _uom.find(data => data.unit === dataProduct.uom);
                                var constructionExist = _construction.find(data => data.code === dataProduct.construction);
                                dataProduct["code"] = generateCode();
                                var newProduct = {
                                    code: dataProduct.code,
                                    currency: {},
                                    description: dataProduct.description,
                                    name: dataProduct.productName,
                                    price: 0,
                                    properties: {
                                        productionOrderId: productionOrderExist._id,
                                        productionOrderNo: productionOrderExist.orderNo,
                                        orderType: productionOrderExist.orderType,
                                        designCode: productionOrderExist.designCode ? productionOrderExist.designCode : "",
                                        designNumber: productionOrderExist.designNumber ? productionOrderExist.designNumber : "",
                                        buyerId: _buyer._id,
                                        buyerName: _buyer.name,
                                        buyerAddress: _buyer.address,
                                        colorName: productionOrderExist.details[0].colorTemplate,
                                        construction: constructionExist.name,
                                        lot: dataProduct.lot,
                                        grade: dataProduct.grade,
                                        weight: dataProduct.weight,
                                        length: dataProduct.length
                                    },
                                    tags: `sales contract #${productionOrderExist.salesContractNo}`,
                                    uom: uomExist,
                                    uomId: uomExist._id
                                };
                                addNewProduct.push(this.addProduct(newProduct));
                            }
                        }
                    }
                    if (addNewProduct.length === 0)
                        addNewProduct.push(Promise.resolve(null));
                    Promise.all(addNewProduct)
                        .then(productResults => {
                            valid.date = new Date(valid.date);
                            valid.buyer = _buyer;
                            valid.buyerId = _buyer._id;
                            var details = [];
                            for (var detail of valid.details) {
                                var productionOrderExist = _spp.find(productionOrder => productionOrder.orderNo === detail.productionOrderNo);
                                detail.productionOrderNo = productionOrderExist.orderNo;
                                detail.productionOrderId = productionOrderExist._id;
                                var items = [];
                                for (var item of detail.items) {
                                    if (item && item.returQuantity > 0) {
                                        var productExist = _product.find(data => data.code === item.productCode);
                                        var uomExist = _uom.find(data => data.unit === item.uom);
                                        item.productId = productExist._id;
                                        item.productName = productExist.name;
                                        item.productCode = productExist.code;
                                        item.productDescription = productExist.description;
                                        item.uomId = uomExist._id;
                                        item.uom = uomExist.unit;
                                        item.weight = item.weight && item.weight !== "" ? item.weight : 0;
                                        var docItem = new FPReturFromBuyerDocItem(item);
                                        docItem._createdDate = dateNow;
                                        docItem.stamp(this.user.username, "manager");
                                        items.push(docItem);
                                    }
                                }
                                if (detail.newProducts && detail.newProducts.length > 0) {
                                    for (var item of detail.newProducts) {
                                        var productExist = productResults.find(data => data.code === item.code);
                                        var uomExist = _uom.find(data => data.unit === item.uom);
                                        var docItem = new FPReturFromBuyerDocItem({
                                            productId: productExist._id,
                                            productName: productExist.name,
                                            productCode: productExist.code,
                                            productDescription: productExist.description,
                                            designNumber: productExist.properties.designNumber,
                                            designCode: productExist.properties.designCode,
                                            remark: item.remark,
                                            colorWay: productExist.properties.colorName,
                                            returQuantity: item.returQuantity,
                                            uomId: uomExist._id,
                                            uom: uomExist.unit,
                                            length: item.length,
                                            weight: item.weight && item.weight !== 0 ? item.weight : 0,
                                            hasNewProduct: true
                                        });
                                        docItem._createdDate = dateNow;
                                        docItem.stamp(this.user.username, "manager");
                                        items.push(docItem);
                                    }
                                }
                                detail.items = items;
                                delete detail.newProducts;
                                var docDetail = new FPReturFromBuyerDocDetail(detail);
                                docDetail._createdDate = dateNow;
                                docDetail.stamp(this.user.username, "manager");
                                details.push(docDetail);
                            }
                            valid.details = details;
                            if(_storage){
                                valid.storageId = _storage._id;
                                valid.storageName = _storage.name;
                            }
                            valid.storageReferenceType = "Retur Barang dari Buyer";
                            valid.storageType = "IN";
                            valid = new FPReturFromBuyerDoc(valid);
                            valid._createdDate = dateNow;
                            valid.stamp(this.user.username, "manager");
                            resolve(valid);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((retur) => {
                var docs = [];
                for (var a of retur.details) {
                    var itemDocs = [];
                    for (var b of a.items) {
                        var items = {
                            productId: b.productId.toString(),
                            uomId: b.uomId.toString(),
                            quantity: b.returQuantity
                        };
                        itemDocs.push(items);
                    }
                    var createDocuments = {
                        storageId: retur.storageId.toString(),
                        referenceNo: retur.code + " - " + a.productionOrderNo,
                        referenceType: "retur-from-buyer",
                        items: itemDocs,
                        type: "IN"
                    };
                    var createOutMove = this.inventoryDocumentManager.create(createDocuments);
                    docs.push(createOutMove);
                }

                return Promise.all(docs);
            })
            .then(results => id);
    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((retur) => {
                var docs = [];
                for (var a of retur.details) {
                    var itemDocs = [];
                    for (var b of a.items) {
                        var items = {
                            productId: b.productId.toString(),
                            uomId: b.uomId.toString(),
                            quantity: b.returQuantity
                        };
                        itemDocs.push(items);
                    }
                    var createDocuments = {
                        storageId: retur.storageId.toString(),
                        referenceNo: retur.code + " - " + a.productionOrderNo,
                        referenceType: "retur-from-buyer",
                        items: itemDocs,
                        type: "OUT"
                    };
                    var createOutMove = this.inventoryDocumentManager.create(createDocuments);
                    docs.push(createOutMove);
                }

                return Promise.all(docs);
            })
            .then(results => id);
    }

    getProductShipmentByPO(productionOrders, buyer) {
        return new Promise((resolve, reject) => {
            this.shipmentDocManager.collection.aggregate([{
                "$unwind": "$details"
            },
            {
                "$unwind": "$details.items"
            },
            {
                "$unwind": "$details.items.packingReceiptItems"
            }, {
                "$match": {
                    "details.productionOrderNo": {
                        "$in": productionOrders
                    },
                    "isVoid": false,
                    "_deleted": false,
                    "buyerId": buyer && ObjectId.isValid(buyer) ? (new ObjectId(buyer)) : ""
                }
            }, {
                "$project": {
                    "buyerCode": 1,
                    "buyerId": 1,
                    "porductionOrderId": "$details.productionOrderId",
                    "productionOrderNo": "$details.productionOrderNo",
                    "productId": "$details.items.packingReceiptItems.productId",
                    "productCode": "$details.items.packingReceiptItems.productCode",
                    "productName": "$details.items.packingReceiptItems.productName",
                    "designCode": "$details.items.packingReceiptItems.designCode",
                    "designNumber": "$details.items.packingReceiptItems.designNumber",
                    "colorWay": "$details.items.packingReceiptItems.colorType",
                    "uomId": "$details.items.packingReceiptItems.uomId",
                    "uom": "$details.items.packingReceiptItems.uomUnit"
                }
            }, {
                "$group": {
                    "_id": {
                        "porductionOrderId": "$porductionOrderId",
                        "productionOrderNo": "$productionOrderNo",
                        "productId": "$productId",
                        "productCode": "$productCode",
                        "productName": "$productName",
                        "designCode": "$designCode",
                        "designNumber": "$designNumber",
                        "colorWay": "$colorWay",
                        "uomId": "$uomId",
                        "uom": "$uom",
                        "buyerCode": "$buyerCode",
                        "buyerId": "$buyerId"
                    }
                }
            }])
                .toArray()
                .then(results => {
                    resolve(results);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getReportMonitoring(query, isExcel) {
        return new Promise((resolve, reject) => {
            var date = new Date();
            var dateString = moment(date).format('YYYY-MM-DD');
            var dateNow = new Date(dateString);
            var dateBefore = dateNow.setDate(dateNow.getDate() - 30);
            query.order = Object.assign({}, (query && query.order ? query.order : { "date": -1 }))
            var _query = [
                { "_deleted": false },
                { "isVoid": false },
                {
                    "date": {
                        "$gte": (query && query.filter && query.filter.dateFrom ? (new Date(query.filter.dateFrom)) : (new Date("1900-01-01"))),
                        "$lte": (query && query.filter && query.filter.dateTo ? (new Date(query.filter.dateTo + "T23:59")) : date)
                    }
                }];
            if (query && query.filter) {
                if (query.filter.code) {
                    _query.push({ "code": query.filter.code });
                }
                if (query.filter.buyer) {
                    _query.push({ "buyer.code": query.filter.buyer });
                }
                if (query.filter.destination) {
                    _query.push({ "destination": query.filter.destination });
                }
                if (query.filter.productionOrderNo) {
                    _query.push({ "details.productionOrderNo": query.filter.productionOrderNo });
                }
            }
            var _aggregate = [
                { "$unwind": "$details" },
                { "$unwind": "$details.items" },
                { "$match": { "$and": _query } },
                {
                    "$project": {
                        "code": 1,
                        "date": 1,
                        "destination": 1,
                        "buyer": "$buyer.name",
                        "spk": 1,
                        "coverLetter": 1,
                        "codeProduct": 1,
                        "productCode": "$details.items.productCode",
                        "productName": "$details.items.productName",
                        "productDescription": "$details.items.productDescription",
                        "orderNo": "$details.productionOrderNo",
                        "remark": "$details.items.remark",
                        "returQuantity": "$details.items.returQuantity",
                        "uom": "$details.items.uom",
                        "length": "$details.items.length",
                        "weight": "$details.items.weight"
                    }
                },
                { "$sort": query.order }
            ];
            var limit = 0;
            var skip = 0;
            var getCount = this.collection.aggregate(_aggregate).toArray();
            if (!isExcel) {
                limit = query && query.size && query.size !== "" ? Number(query.size) : 4;
                skip = query && query.page && query.page !== "" ? ((Number(query.page) - 1) * limit) : 0;
                _aggregate.push({ "$skip": skip });
                _aggregate.push({ "$limit": limit });
            }
            var getData = this.collection.aggregate(_aggregate).toArray();
            Promise.all([getCount, getData])
                .then(results => {
                    var count = results[0].length;
                    var docs = results[1];
                    var result = {
                        data: docs,
                        count: docs.length,
                        size: limit,
                        total: count,
                        page: query && query.page && query.page !== "" ? Number(query.page) : 1,
                        filter: query && query.filter ? query.filter : null,
                        order: query.order
                    }
                    resolve(result);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    getXls(dataReport) {
        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            xls.options = [];
            xls.name = '';

            var index = 0;
            var dateFormat = "DD/MM/YYYY";
            var query = dataReport.info ? dataReport.info.filter : dataReport.filter;
            for (var data of dataReport.data) {
                index++;
                var item = {};
                item["No"] = index;
                item["No Retur"] = data.code ? data.code : '';
                item["Tgl Retur"] = data.date ? moment(data.date).format("DD/MM/YYYY") : '';
                item["Yang Menerima"] = data.destination ? data.destination : '';
                item["Buyer"] = data.buyer ? data.buyer : '';
                item["No Spk"] = data.spk ? data.spk : '';
                item["No Surat Pengantar"] = data.coverLetter ? data.coverLetter : '';
                item["Kode Barang"] = data.codeProduct ? data.codeProduct : '';
                item["No Order"] = data.orderNo ? data.orderNo : '';
                item["Nama Barang"] = data.productName ? data.productName : '';
                item["Ket Produk"] = data.productDescription ? data.productDescription : '';
                item["Keterangan"] = data.remark ? data.remark : '';
                item["Jumlah Retur"] = data.returQuantity ? data.returQuantity : 0;
                item["Satuan"] = data.uom ? data.uom : '';
                item["Panjang (Meter)"] = data.length ? (data.length * data.returQuantity).toFixed(2) : 0;
                item["Berat (Kg)"] = data.weight ? (data.weight * data.returQuantity).toFixed(2) : 0;

                xls.data.push(item);
            }

            xls.options["No"] = "number";
            xls.options["No Retur"] = "string";
            xls.options["Tgl Retur"] = "string";
            xls.options["Yang Menerima"] = "string";
            xls.options["Buyer"] = "string";
            xls.options["No Spk"] = "string";
            xls.options["No Surat Pengantar"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["No Order"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Ket Produk"] = "string";
            xls.options["Keterangan"] = "string";
            xls.options["Jumlah Retur"] = "number";
            xls.options["Satuan"] = "string";
            xls.options["Panjang (Meter)"] = "number";
            xls.options["Berat (Kg)"] = "number";

            if (query && query.dateFrom && query.dateTo) {
                xls.name = `Retur Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (query && !query.dateFrom && query.dateTo) {
                xls.name = `Retur Report sampai tanggal ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (query && query.dateFrom && !query.dateTo) {
                xls.name = `Retur Report dari tanggal ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
            }
            else
                xls.name = `Retur Report.xlsx`;

            resolve(xls);
        });
    }

    pdf(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(purchaseRequest => {
                    var getDefinition = require("../../../pdf/definitions/fp-retur-fr-byr-doc");
                    var definition = getDefinition(purchaseRequest, offset);

                    var generatePdf = require("../../../pdf/pdf-generator");
                    generatePdf(definition)
                        .then(binary => {
                            resolve(binary);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.inventory.finishingPrinting.collection.FPReturFromBuyerDoc}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var codeIndex = {
            name: `ix_${Map.inventory.finishingPrinting.collection.FPReturFromBuyerDoc}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}