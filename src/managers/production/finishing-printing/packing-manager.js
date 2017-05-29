"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');

var generateCode = require("../../../utils/code-generator");

var ProductionOrderManager = require('../../sales/production-order-manager');
var ProductManager = require('../../master/product-manager');
var UomManager = require('../../master/uom-manager');

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
                    .then((salesContractNo) => {
                        var query = {
                            _deleted: false,
                            unit: packing.packingUom
                        };
                        return this.uomManager.getSingleByQueryOrDefault(query)
                            .then((uom) => {
                                var getProduct = packing.items.map(item => {
                                    var productName = `${salesContractNo.salesContractNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}`;
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


                                                var createPackingProduct = packing.items.map(item => {
                                                    var pName = `${salesContractNo.salesContractNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}`;
                                                    var packingProduct = {
                                                        code: generateCode(),
                                                        currency: {},
                                                        description: "",
                                                        name: pName,
                                                        price: 0,
                                                        properties: {},
                                                        tags: `sales contract #${salesContractNo.salesContractNo}`,
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
                    .then((salesContractNo) => {
                        var query = {
                            _deleted: false,
                            unit: packing.packingUom
                        };
                        return this.uomManager.getSingleByQueryOrDefault(query)
                            .then((uom) => {
                                var getProduct = packing.items.map(item => {
                                    var productName = `${salesContractNo.salesContractNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}`;
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


                                                var createPackingProduct = packing.items.map(item => {
                                                    var pName = `${salesContractNo.salesContractNo}/${packing.colorName}/${packing.construction}/${item.lot}/${item.grade}`;
                                                    var packingProduct = {
                                                        code: generateCode(),
                                                        currency: {},
                                                        description: "",
                                                        name: pName,
                                                        price: 0,
                                                        properties: {},
                                                        tags: `sales contract #${salesContractNo.salesContractNo}`,
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

        return Promise.all([getDbPacking, getDuplicatePacking, getProductionOrder])
            .then(results => {
                var _dbPacking = results[0];
                var _duplicatePacking = results[1];
                var _productionOrder = results[2];

                if (_dbPacking)
                    valid.code = _dbPacking.code; // prevent code changes.

                if (_duplicatePacking)
                    errors["code"] = i18n.__("Packing.code.isExist: %s is exist", i18n.__("Packing.code._:Code"));

                if (!valid.productionOrderId || valid.productionOrderId === '')
                    errors["productionOrderId"] = i18n.__("Packing.productionOrderId.isRequired:%s is required", i18n.__("Packing.productionOrderId._:Production Order")); //"Grade harus diisi";   
                else if (!_productionOrder)
                    errors["productionOrderId"] = i18n.__("Packing.productionOrderId: %s not found", i18n.__("Packing.productionOrderId._:Production Order"));

                if (!valid.date)
                    errors["date"] = i18n.__("Packing.date.isRequired:%s is required", i18n.__("Packing.date._:Date")); //"Grade harus diisi";

                if (!valid.packingUom || valid.packingUom === '')
                    errors["packingUom"] = i18n.__("Packing.packingUom.isRequired:%s is required", i18n.__("Packing.packingUom._:Packing UOM")); //"Grade harus diisi";   

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
                        else {
                            var dup = valid.items.find((test, idx) => (item.lot === test.lot && item.grade === test.grade) && index != idx);
                            if (dup) {
                                itemsError["lot"] = i18n.__("Packing.items.lot.isDuplicate:%s is duplicate", i18n.__("Packing.items.lot._:Lot"));
                                itemsError["grade"] = i18n.__("Packing.items.grade.isDuplicate:%s is duplicate", i18n.__("Packing.items.grade._:Grade"));
                            }
                        }

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
                valid.buyer = _productionOrder.buyer.name;
                valid.buyerLocation = _productionOrder.buyer.type;
                valid.colorName = targetColor.colorRequest;
                valid.construction = `${_productionOrder.material.name} / ${_productionOrder.materialConstruction.name} / ${_productionOrder.materialWidth}`;

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
                item["Buyer"] = packing.buyer ? packing.buyer : '';
                item["Konstruksi"] = packing.construction ? packing.construction : '';
                item["Design/Motif"] = packing.motif ? packing.motif : '';
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