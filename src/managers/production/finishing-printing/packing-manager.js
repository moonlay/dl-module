"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');

var generateCode = require("../../../utils/code-generator");

var ProductionOrderManager = require('../../sales/production-order-manager');

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
            keywordFilter["$or"] = [codeFilter, productionOrderNoFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
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
