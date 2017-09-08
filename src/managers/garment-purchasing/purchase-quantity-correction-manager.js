'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var PurchaseOrderManager = require('./purchase-order-manager');
var DeliveryOrderManager = require('./delivery-order-manager');
var PurchaseQuantityCorrection = DLModels.garmentPurchasing.GarmentPurchaseCorrection;
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var moment = require('moment');

const SELECTED_PURCHASE_ORDER_FIELDS = {
    "iso": 1,
    "refNo": 1,
    "artikel": 1,
    "unitId": 1,
    "unit.code": 1,
    "unit.name": 1,
    "unit.divisionId": 1,
    "unit.division.code": 1,
    "unit.division.name": 1,
    "date": 1
}

module.exports = class PurchaseQuantityCorrectionManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentPurchaseCorrection);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentPurchaseCorrection}_date`,
            key: {
                date: -1
            }
        }

        var noIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentPurchaseCorrection}_no`,
            key: {
                no: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    _getQuery(paging) {
        var defaultFilter = {
            _deleted: false,
            correctionType: "Jumlah"
        };
        var keywordFilter = {};

        var query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterNo = {
                'no': {
                    '$regex': regex
                }
            };

            var filterSupplierName = {
                'deliveryOrder.supplier.name': {
                    '$regex': regex
                }
            };

            var filterDeliveryOrderNo = {
                'deliveryOrder.no': {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplierName, filterDeliveryOrderNo]
            };
        }
        query = {
            '$and': [defaultFilter, paging.filter, keywordFilter]
        }
        return query;
    }

    _validate(purchaseQuantityCorrection) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = purchaseQuantityCorrection;

            var getPurchaseQuantityCorrection = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    "no": valid.no
                }, {
                    _deleted: false
                }]
            });

            valid.items = valid.items || [];

            var purchaseOrders = [];

            if (valid.items.length > 0) {
                for (var item of valid.items) {
                    if (ObjectId.isValid(item.purchaseOrderInternalId)) {
                        purchaseOrders.push(new ObjectId(item.purchaseOrderInternalId));
                    }
                }
            }

            var getDeliveryOrder = valid.deliveryOrder && ObjectId.isValid(valid.deliveryOrderId) ? this.deliveryOrderManager.getSingleByIdOrDefault(valid.deliveryOrderId) : Promise.resolve(null);

            var getPurchaseOrder = purchaseOrders.length > 0 ? this.purchaseOrderManager.collection.find({ "_id": { "$in": purchaseOrders } }, SELECTED_PURCHASE_ORDER_FIELDS).toArray() : Promise.resolve([]);

            Promise.all([getPurchaseQuantityCorrection, getDeliveryOrder, getPurchaseOrder])
                .then((results) => {
                    var _purchaseQuantityCorrection = results[0];
                    var _deliveryOrder = results[1];
                    var _purchaseOrders = results[2];

                    var now = new Date();
                    if (_purchaseQuantityCorrection)
                        errors["no"] = i18n.__("PurchaseQuantityCorrection.no.isExists:%s is already exists", i18n.__("PurchaseQuantityCorrection.no._:No"));

                    if (!_deliveryOrder)
                        errors["deliveryOrderId"] = i18n.__("PurchaseQuantityCorrection.deliveryOrder.isRequired:%s is required", i18n.__("PurchaseQuantityCorrection.deliveryOrder._:Delivery Order"));
                    else if (!valid.deliveryOrderId)
                        errors["deliveryOrderId"] = i18n.__("PurchaseQuantityCorrection.deliveryOrder.isRequired:%s is required", i18n.__("PurchaseQuantityCorrection.deliveryOrder._:Delivery Order"));
                    else if (!valid.deliveryOrder)
                        errors["deliveryOrderId"] = i18n.__("PurchaseQuantityCorrection.deliveryOrder.isRequired:%s is required", i18n.__("PurchaseQuantityCorrection.deliveryOrder._:Delivery Order"));

                    if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("PurchaseQuantityCorrection.date.isRequired:%s is required", i18n.__("PurchaseQuantityCorrection.date._:Correction Date"));
                    if (new Date(valid.date) > now)
                        errors["date"] = i18n.__("PurchaseQuantityCorrection.date.isGreater:%s is greater than now", i18n.__("PurchaseQuantityCorrection.date._:Correction Date"));

                    if (valid.items && !ObjectId.isValid(valid._id)) {
                        if (valid.items.length > 0) {
                            var itemErrors = [];

                            for (var item of valid.items) {
                                var itemError = {};
                                if (item.quantity <= 0) {
                                    itemError["quantity"] = i18n.__("PurchaseQuantityCorrection.items.quantity.isRequired:%s is required", i18n.__("PurchaseQuantityCorrection.items.quantity._:Quantity"));
                                }

                                var doItem = _deliveryOrder.items.find((i) => i.purchaseOrderExternalId.toString() === item.purchaseOrderExternalId.toString());
                                var fulfillment = doItem.fulfillments.find((fulfillment) => fulfillment.purchaseOrderId.toString() === item.purchaseOrderInternalId.toString() && fulfillment.purchaseRequestId.toString() === item.purchaseRequestId.toString() && fulfillment.productId.toString() === item.productId.toString());
                                var purchaseOrder = _purchaseOrders.find((purchaseOrder) => purchaseOrder._id.toString() === item.purchaseOrderInternalId.toString());

                                item.purchaseOrderInternal = purchaseOrder;

                                if (fulfillment) {
                                    fulfillment.corrections = fulfillment.corrections || [];

                                    if (fulfillment.corrections.length > 0) {
                                        if (item.quantity === fulfillment.corrections[fulfillment.corrections.length - 1].correctionQuantity) {
                                            itemError["quantity"] = i18n.__("PurchaseQuantityCorrection.items.quantity.noChanges:%s doesn't change", i18n.__("unitPaymentPriceCorrectionNote.items.pricePerUnit._:Kuantiti"));
                                        }
                                    } else {
                                        if (item.quantity === fulfillment.deliveredQuantity) {
                                            itemError["quantity"] = i18n.__("PurchaseQuantityCorrection.items.quantity.noChanges:%s doesn't change", i18n.__("unitPaymentPriceCorrectionNote.items.pricePerUnit._:Kuantiti"));
                                        }
                                    }
                                }

                                itemErrors.push(itemError);
                            }

                            for (var itemError of itemErrors) {
                                for (var prop in itemError) {
                                    errors.items = itemErrors;
                                    break;
                                }
                                if (errors.items)
                                    break;
                            }
                        }
                    }

                    valid.correctionType = "Jumlah"

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    if (!valid.stamp)
                        valid = new PurchaseQuantityCorrection(valid);

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch((e) => {
                    reject(e);
                })

        });
    }



    _beforeInsert(purchaseQuantityCorrection) {
        purchaseQuantityCorrection.no = generateCode();
        return Promise.resolve(purchaseQuantityCorrection);
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((purchaseQuantityCorrection) => {
                return this.updateDeliveryOrder(purchaseQuantityCorrection);
            })
            .then((purchaseQuantityCorrection) => {
                return this.updatePOInternal(purchaseQuantityCorrection);
            })
            .then(() => {
                return Promise.resolve(id);
            });
    }


    updateDeliveryOrder(purchaseQuantityCorrection) {
        return this.deliveryOrderManager.getSingleById(purchaseQuantityCorrection.deliveryOrderId)
            .then((deliveryOrder) => {
                for (var correction of purchaseQuantityCorrection.items) {
                    var purchaseOrderExternalId = correction.purchaseOrderExternalId;
                    var doItem = deliveryOrder.items.find((item) => item.purchaseOrderExternalId.toString() === purchaseOrderExternalId.toString());
                    var fulfillment = doItem.fulfillments.find((fulfillment) => fulfillment.purchaseOrderId.toString() === correction.purchaseOrderInternalId.toString() && fulfillment.purchaseRequestId.toString() === correction.purchaseRequestId.toString() && fulfillment.productId.toString() === correction.productId.toString());

                    correction.oldQuantity = fulfillment.deliveredQuantity;

                    if (fulfillment) {
                        fulfillment.corrections = fulfillment.corrections || [];

                        var _correction = {
                            correctionDate: purchaseQuantityCorrection.date,
                            correctionNo: purchaseQuantityCorrection.no,
                            correctionType: purchaseQuantityCorrection.correctionType,
                            correctionQuantity: correction.quantity,
                            correctionPricePerUnit: correction.pricePerUnit,
                            correctionPriceTotal: correction.priceTotal
                        };

                        fulfillment.corrections.push(_correction);
                    }
                }

                return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder)
                    .then((result) => {
                        return Promise.resolve(purchaseQuantityCorrection);
                    })
            });
    }

    updatePOInternal(purchaseQuantityCorrection) {
        var correctionItems = purchaseQuantityCorrection.items.map((item) => {
            return {
                purchaseOrderId: item.purchaseOrderInternalId,
                correctionNo: purchaseQuantityCorrection.no,
                correctionDate: purchaseQuantityCorrection.date,
                correctionType: purchaseQuantityCorrection.correctionType,
                currencyRate: item.currencyRate,
                quantity: item.quantity,
                deliveryOrderNo: purchaseQuantityCorrection.deliveryOrder.no,
                pricePerUnit: item.pricePerUnit,
                priceTotal: item.priceTotal,
                productId: item.productId,
                oldQuantity: item.oldQuantity,
                oldPriceTotal: item.oldQuantity * item.pricePerUnit
            }
        });
        correctionItems = [].concat.apply([], correctionItems);

        var map = new Map();
        for (var correction of correctionItems) {
            var key = correction.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(correction);
        }

        var jobs = [];
        map.forEach((corrections, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    for (var correction of corrections) {
                        var productId = correction.productId;
                        var poItem = purchaseOrder.items.find((item) => item.product._id.toString() === productId.toString());
                        var fulfillment = poItem.fulfillments.find((fulfillment) => correction.deliveryOrderNo === fulfillment.deliveryOrderNo)

                        if (fulfillment) {
                            fulfillment.corrections = fulfillment.corrections || [];

                            var oldPricePerUnit = 0;
                            var newPricePerUnit = correction.pricePerUnit
                            var oldPriceTotal = 0;
                            var newPriceTotal = correction.priceTotal;
                            var oldQuantity = 0;
                            var newQuantity = correction.quantity;

                            if (fulfillment.corrections.length > 0) {
                                oldPricePerUnit = fulfillment.corrections[fulfillment.corrections.length - 1].newPricePerUnit;
                                oldPriceTotal = fulfillment.corrections[fulfillment.corrections.length - 1].newPriceTotal;
                                oldQuantity = fulfillment.corrections[fulfillment.corrections.length - 1].newCorrectionQuantity;
                            } else {
                                oldPricePerUnit = poItem.pricePerDealUnit;
                                oldPriceTotal = correction.oldPriceTotal;
                                oldQuantity = correction.oldQuantity;
                            }


                            var _correction = {
                                correctionNo: correction.correctionNo,
                                correctionDate: correction.correctionDate,
                                correctionType: correction.correctionType,
                                currencyRate: correction.currencyRate,
                                oldCorrectionQuantity: oldQuantity,
                                newCorrectionQuantity: newQuantity,
                                oldPricePerUnit: oldPricePerUnit,
                                newPricePerUnit: newPricePerUnit,
                                oldPriceTotal: oldPriceTotal,
                                newPriceTotal: newPriceTotal
                            };

                            fulfillment.corrections.push(_correction);
                        }
                    }
                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                });
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(purchaseQuantityCorrection);
        })
    }

    getPdf(data, offset) {
        return new Promise((resolve, reject) => {
            var getDefinition = require("../../pdf/definitions/garment-purchase-quantity-correction");
            var definition = getDefinition(data, offset);

            var generatePdf = require("../../pdf/pdf-generator");
            generatePdf(definition)
                .then((binary) => {
                    resolve(binary);
                })
                .catch((e) => {
                    reject(e);
                });
        })
    }

}