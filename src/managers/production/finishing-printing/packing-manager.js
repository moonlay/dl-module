"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');

var generateCode = require("../../../utils/code-generator");

var ProductionOrderManager = require('../../sales/production-order-manager');
var ProductManager = require('../../master/product-manager');
var UomManager = require('../../master/uom-manager');
var BuyerManager = require('../../master/buyer-manager');
var MaterialConstructionManager = require('../../master/material-construction-manager');

var Models = require("dl-models");
var Map = Models.map;
var PackingModel = Models.production.finishingPrinting.qualityControl.Packing;
var PackingItemModel = Models.production.finishingPrinting.qualityControl.PackingItem;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class PackingManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.production.finishingPrinting.qualityControl.collection.Packing);
        this.productionOrderManager = new ProductionOrderManager(db, user);
        this.productManager = new ProductManager(db, user);
        this.uomManager = new UomManager(db, user);
        this.buyerManager = new BuyerManager(db, user);
        this.materialConstructionManager = new MaterialConstructionManager(db, user);
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
            var productionOrderNoFilter = {
                "productionOrderNo": {
                    "$regex": regex
                }
            };
            var buyerFilter = {
                "buyer": {
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
            var motifFilter = {
                "motif": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, productionOrderNoFilter, buyerFilter, colorNameFilter, constructionFilter, motifFilter];
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
            .then((packing) => {
                return this.productionOrderManager.getSingleByQueryOrDefault(packing.productionOrderId)
                    .then((productionOrder) => {
                        var query = {
                            _deleted: false,
                            unit: packing.packingUom
                        };
                        return this.uomManager.getSingleByQueryOrDefault(query)
                            .then((uom) => {
                                var getProduct = packing.items.map((item) => {
                                    var productName = `${productionOrder.orderNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}/${item.length}`;
                                    query = {
                                        _deleted: false,
                                        name: productName
                                    };
                                    return this.productManager.getSingleByQueryOrDefault(query);

                                });
                                return Promise.all(getProduct)
                                    .then((products) => {
                                        for (var product of products) {
                                            if (product) {
                                                var dataPackingProduct = products
                                                return Promise.all(dataPackingProduct)
                                            } else {


                                                var createPackingProduct = packing.items.map((item) => {
                                                    var pName = item.remark !== "" || item.remark !== null ? `${productionOrder.orderNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}/${item.length}/${item.remark}` : `${productionOrder.orderNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}/${item.length}`;
                                                    var packingProduct = {
                                                        code: generateCode(),
                                                        currency: {},
                                                        description: "",
                                                        name: pName,
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
                                                            lot: item.lot,
                                                            grade: item.grade,
                                                            weight: item.weight,
                                                            length: item.length
                                                        },
                                                        tags: `sales contract #${productionOrder.salesContractNo}`,
                                                        uom: uom,
                                                        uomId: uom._id

                                                    };
                                                    return this.productManager.create(packingProduct);
                                                })
                                                return Promise.all(createPackingProduct)
                                            }
                                        }
                                    })

                                    .then(results => id);
                            })
                    })
            })


    }

    _afterUpdate(id) {

        return this.getSingleById(id)
            .then((packing) => {
                return this.productionOrderManager.getSingleByQueryOrDefault(packing.productionOrderId)
                    .then((productionOrder) => {
                        var query = {
                            _deleted: false,
                            unit: packing.packingUom
                        };
                        return this.uomManager.getSingleByQueryOrDefault(query)
                            .then((uom) => {
                                var getProduct = packing.items.map((item) => {
                                    var productName = item.remark !== "" || item.remark !== null ? `${productionOrder.orderNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}/${item.length}/${item.remark}` : `${productionOrder.orderNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}/${item.length}`;
                                    query = {
                                        _deleted: false,
                                        name: productName
                                    };
                                    return this.productManager.getSingleByQueryOrDefault(query);

                                });
                                return Promise.all(getProduct)
                                    .then((products) => {
                                        for (var product of products) {
                                            if (product) {
                                                var dataPackingProduct = products
                                                return Promise.all(dataPackingProduct)
                                            } else {


                                                var createPackingProduct = packing.items.map((item) => {
                                                    var pName = item.remark !== "" || item.remark !== null ? `${productionOrder.orderNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}/${item.length}/${item.remark}` : `${productionOrder.orderNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}/${item.length}`;
                                                    var packingProduct = {
                                                        code: generateCode(),
                                                        currency: {},
                                                        description: "",
                                                        name: pName,
                                                        price: 0,
                                                        properties: {
                                                            productionOrderId: productionOrder._id,
                                                            productionOrderNo: productionOrder.orderNo,
                                                            orderType: productionOrder.orderType,
                                                            designCode: productionOrder.designCode ? productionOrder.designCode : "",
                                                            designNumber: productionOrder.designNumber ? productionOrder.designNumber : "",
                                                            buyerId: packing.buyerId,
                                                            buyerName: packing.buyerName,
                                                            buyerAddress: packing.buyerAddress,
                                                            colorName: packing.colorName,
                                                            construction: packing.construction,
                                                            lot: item.lot,
                                                            grade: item.grade,
                                                            weight: item.weight,
                                                            length: item.length
                                                        },
                                                        tags: `sales contract #${productionOrder.salesContractNo}`,
                                                        uom: uom,
                                                        uomId: uom._id

                                                    };
                                                    return this.productManager.create(packingProduct);
                                                })
                                                return Promise.all(createPackingProduct)
                                            }
                                        }
                                    })

                                    .then(results => id);
                            })
                    })
            })

    }



    _validate(fabricQualityControl) {
        var errors = {};
        var valid = fabricQualityControl;

        var getDbPacking = this.collection.singleOrDefault({
            _id: new ObjectId(valid._id)
        });
        var getDuplicatePacking = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });
        var getProductionOrder = valid.productionOrderId && ObjectId.isValid(valid.productionOrderId) ? this.productionOrderManager.getSingleByIdOrDefault(valid.productionOrderId) : Promise.resolve(null);
        var getBuyer = valid.buyerId && ObjectId.isValid(valid.buyerId) ? this.buyerManager.getSingleByIdOrDefault(valid.buyerId) : Promise.resolve(null);
        var getMaterialConstruction = valid.materialConstructionFinishId && ObjectId.isValid(valid.materialConstructionFinishId) ? this.materialConstructionManager.getSingleByIdOrDefault(valid.materialConstructionFinishId) : Promise.resolve(null);

        return Promise.all([getDbPacking, getDuplicatePacking, getProductionOrder, getBuyer, getMaterialConstruction])
            .then(results => {
                var _dbPacking = results[0];
                var _duplicatePacking = results[1];
                var _productionOrder = results[2];
                var _buyer = results[3];
                var _materialContructionFinish = results[4];

                if (_dbPacking)
                    valid.code = _dbPacking.code; // prevent code changes.

                if (_duplicatePacking)
                    errors["code"] = i18n.__("Packing.code.isExist: %s is exist", i18n.__("Packing.code._:Code"));

                if (!_productionOrder)
                    errors["productionOrderId"] = i18n.__("Packing.productionOrderId.isExists: %s is not exists", i18n.__("Packing.productionOrderId._:Production Order"));
                else if (!valid.productionOrderId || valid.productionOrderId === '')
                    errors["productionOrderId"] = i18n.__("Packing.productionOrderId.isRequired:%s is required", i18n.__("Packing.productionOrderId._:Production Order")); //"Nomor Order harus diisi";                       

                if (!_buyer)
                    errors["buyerId"] = i18n.__("Packing.buyerId.isExists: %s is not exists", i18n.__("Packing.buyerId._:Buyer"));
                else if (!valid.buyerId || valid.buyerId === '')
                    errors["buyerId"] = i18n.__("Packing.buyerId.isRequired:%s is required", i18n.__("Packing.buyerId._:Buyer")); //"Buyer harus diisi";   

                if (!_materialContructionFinish)
                    errors["materialConstructionFinishId"] = i18n.__("Packing.materialConstructionFinishId.isExists: %s is not exists", i18n.__("Packing.materialConstructionFinishId._:Material Konstruksi Finish"));
                else if (!valid.materialConstructionFinishId || valid.materialConstructionFinishId === '')
                    errors["materialConstructionFinishId"] = i18n.__("Packing.materialConstructionFinishId.isRequired:%s is required", i18n.__("Packing.materialConstructionFinishId._:Material Konstruksi Finish")); //"Material Konstruksi harus diisi";   

                if (!valid.date)
                    errors["date"] = i18n.__("Packing.date.isRequired:%s is required", i18n.__("Packing.date._:Date")); //"Grade harus diisi";

                if (!valid.packingUom || valid.packingUom === '')
                    errors["packingUom"] = i18n.__("Packing.packingUom.isRequired:%s is required", i18n.__("Packing.packingUom._:Packing UOM")); //"UOM harus diisi";   

                if (!valid.materialWidthFinish || valid.materialWidthFinish === '')
                    errors["materialWidthFinish"] = i18n.__("Packing.materialWidthFinish.isRequired:%s is required", i18n.__("Packing.materialWidthFinish._:Lebar Finish")); //"UOM harus diisi";   

                var targetColor;
                if (!valid.colorCode || valid.colorCode === '')
                    errors["colorCode"] = i18n.__("Packing.colorCode.isRequired:%s is required", i18n.__("Packing.colorCode._:Selected Color")); //"Operator IM harus diisi";   
                else {
                    targetColor = _productionOrder.details.find((item) => item.code === valid.colorCode);
                    if (!targetColor)
                        errors["colorCode"] = i18n.__("Packing.colorCode.notFound:%s not found", i18n.__("Packing.colorCode._:Selected Color")); //"Operator IM harus diisi";       

                }

                valid.items = valid.items || [];
                if (valid.items && valid.items.length <= 0) {
                    errors["items"] = i18n.__("Packing.items.isRequired:%s is required", i18n.__("Packing.items._: Packing Items")); //"Harus ada minimal 1 barang";
                }
                else {
                    var itemsErrors = [];
                    valid.items.forEach((item, index) => {
                        var itemsError = {};
                        if (!item.lot || item.lot.trim() === "")
                            itemsError["lot"] = i18n.__("Packing.items.lot.isRequired:%s is required", i18n.__("Packing.items.lot._:Lot"));

                        if (!item.grade || item.grade.trim() === "")
                            itemsError["grade"] = i18n.__("Packing.items.grade.isRequired:%s is required", i18n.__("Packing.items.grade._:Grade"));
                        itemsErrors.push(itemsError);
                    })

                    for (var itemsError of itemsErrors) {
                        if (Object.getOwnPropertyNames(itemsError).length > 0) {
                            errors.items = itemsErrors;
                            break;
                        }
                    }

                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }


                valid.productionOrderId = _productionOrder._id;
                valid.productionOrderNo = _productionOrder.orderNo;

                //Buyer Detail
                valid.buyerId = _buyer._id;
                valid.buyerCode = _buyer.code;
                valid.buyerName = _buyer.name;
                valid.buyerAddress = _buyer.address;
                valid.buyerType = _buyer.type;

                //Material Konstruksi Finish
                valid.materialConstructionFinishId = _materialContructionFinish._id;
                valid.materialConstructionFinishName = _materialContructionFinish.name;

                //Width Finish

                valid.colorName = targetColor.colorRequest;
                valid.construction = `${_productionOrder.material.name} / ${_materialContructionFinish.name} / ${valid.materialWidthFinish}`;

                valid.salesContractNo = _productionOrder.salesContractNo;

                // valid.items.forEach(test => {
                //     test.pointSystem = valid.pointSystem;
                //     this.calculateGrade(test);
                // });

                if (!valid.stamp) {
                    valid = new PackingModel(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);


            })
    }

    getPackingReport(info) {
        var _defaultFilter = {
            _deleted: false
        }, NomorOrderFilter = {},
            NomorPackingFilter = {},
            dateFromFilter = {},
            dateToFilter = {},
            query = {};

        var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
        var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59")) : (new Date());
        var now = new Date();

        if (info.code && info.code != '') {
            var NomorPacking = ObjectId.isValid(info.code) ? new ObjectId(info.code) : {};
            NomorPackingFilter = { '_id': NomorPacking };
        }

        if (info.productionOrderNo && info.productionOrderNo != '') {
            var productionOrderNomor = ObjectId.isValid(info.productionOrderNo) ? new ObjectId(info.productionOrderNo) : {};
            NomorOrderFilter = { 'productionOrderId': productionOrderNomor };
        }

        var filterDate = {
            "date": {
                $gte: new Date(dateFrom),
                $lte: new Date(dateTo)
            }
        };

        query = { '$and': [_defaultFilter, NomorOrderFilter, NomorPackingFilter, filterDate] };

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
        var timeFormat = "HH : mm";

        for (var packing of result.data) {

            for (var packingItem of packing.items) {
                var item = {};
                index += 1;
                item["No"] = index;
                item["Nomor Packing"] = packing.code ? packing.code : '';
                item["Nomor Order"] = packing.productionOrderNo ? packing.productionOrderNo : '';
                item["Jenis Order"] = packing.orderType ? packing.orderType : '';
                item["Buyer"] = packing.buyer ? packing.buyer : '';
                item["Konstruksi"] = packing.construction ? packing.construction : '';
                item["Design/Motif"] = packing.designNumber ? packing.designNumber : '';
                item["Warna yang diminta"] = packing.colorName ? packing.colorName : '';
                item["Tanggal"] = packing.date ? moment(new Date(packing.date)).format(dateFormat) : '';


                item["Lot"] = packingItem.lot ? packingItem.lot : '';
                item["Grade"] = packingItem.grade ? packingItem.grade : '';
                item["Berat"] = packingItem.weight ? packingItem.weight : '';
                item["Panjang"] = packingItem.length ? packingItem.length : '';
                item["Quantity"] = packingItem.quantity ? packingItem.quantity : '';
                item["Keterangan"] = packingItem.remark ? packingItem.remark : '';
                xls.options[packingItem.lot] = "string";
                xls.options[packingItem.grade] = "string";
                xls.options[packingItem.weight] = "number";
                xls.options[packingItem.length] = "number";
                xls.options[packingItem.quantity] = "number";
                xls.options[packingItem.remark] = "string";

                xls.data.push(item);
            }

        }

        // xls.options["No"] = "number";
        xls.options["Nomor Packing"] = "string";
        xls.options["Nomor Order"] = "string";
        xls.options["Jenis Order"] = "string";
        xls.options["Buyer"] = "string";
        xls.options["Konstruksi"] = "string";
        xls.options["Design/Motif"] = "string";
        xls.options["Warna yang diminta"] = "string";
        xls.options["Tanggal"] = "string";

        if (query.dateFrom && query.dateTo) {
            xls.name = `Packing Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Packing Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Packing Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Packing Report.xlsx`;

        return Promise.resolve(xls);
    }


    pdf(packing, offset) {
        return new Promise((resolve, reject) => {
            var getDefinition = require("../../../pdf/definitions/packing");
            var definition = getDefinition(packing, offset);

            var generatePdf = require("../../../pdf/pdf-generator");
            generatePdf(definition, offset)
                .then(binary => {
                    resolve(binary);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.production.finishingPrinting.qualityControl.collection.Packing}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var codeIndex = {
            name: `ix_${Map.production.finishingPrinting.qualityControl.collection.Packing}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    };
};