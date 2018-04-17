'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var PurchaseOrderManager = require('./purchase-order-manager');
var DeliveryOrderManager = require('./delivery-order-manager');
var PurchaseOrderExternalManager = require('./purchase-order-external-manager');
var GarmentPurchaseCorrection = DLModels.garmentPurchasing.GarmentPurchaseCorrection;
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var moment = require('moment');

module.exports = class PurchasePriceCorrection extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentPurchaseCorrection);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, user);
    }

    _validate(garmentPurchaseCorrection) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = garmentPurchaseCorrection;

            var getGarmentPurchaseCorrection = this.collection.singleOrDefault({
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


            var getDeliveryOrder = valid.deliveryOrder && ObjectId.isValid(valid.deliveryOrder._id) ? this.deliveryOrderManager.getSingleByIdOrDefault(valid.deliveryOrder._id) : Promise.resolve(null);

            var getPOInternal = [];
            valid.items = valid.items || [];
            for (var _item of valid.items) {
                if (ObjectId.isValid(_item.purchaseOrderInternalId)) {
                    var poId = new ObjectId(_item.purchaseOrderInternalId);
                    getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(poId));
                }
            }

            Promise.all([getGarmentPurchaseCorrection, getDeliveryOrder].concat(getPOInternal))
                .then(results => {
                    var _garmentPurchaseCorrection = results[0];
                    var _deliveryOrder = results[1];
                    var _poInternals = results.slice(2, results.length);

                    var now = new Date();
                    if (_garmentPurchaseCorrection)
                        errors["no"] = i18n.__("garmentPurchaseCorrection.no.isExists:%s is already exists", i18n.__("garmentPurchaseCorrection.no._:No"));

                    // if (!valid.date || valid.date == '')
                    //     errors["date"] = i18n.__("garmentPurchaseCorrection.date.isRequired:%s is required", i18n.__("garmentPurchaseCorrection.date._:Correction Date"));
                    // else if (new Date(valid.date) > new Date())
                    //     errors["date"] = i18n.__("garmentPurchaseCorrection.date.mustBeLessEqual:%s must be less than or equals today's", i18n.__("garmentPurchaseCorrection.date._:Correction Date"));

                    if (!valid.deliveryOrder || valid.deliveryOrder == '')
                        errors["deliveryOrder"] = i18n.__("garmentPurchaseCorrection.deliveryOrder.isRequired:%s is required", i18n.__("garmentPurchaseCorrection.deliveryOrder._:Delivery Order"));
                    else if (!_deliveryOrder)
                        errors["deliveryOrder"] = i18n.__("garmentPurchaseCorrection.deliveryOrder.notFound:%s not found", i18n.__("garmentPurchaseCorrection.deliveryOrder._:Delivery Order"));
                    else if (!_deliveryOrder.hasInvoice)
                        errors["deliveryOrder"] = i18n.__("garmentPurchaseCorrection.deliveryOrder.hasInvoice:%s not has invoice", i18n.__("garmentPurchaseCorrection.deliveryOrder._:Delivery Order"));

                    if (valid.items) {
                        if (valid.items.length > 0) {
                            var itemErrors = [];

                            for (var item of valid.items) {
                                var dataPO = _poInternals.find(po => po._id.toString() === item.purchaseOrderInternalId.toString());
                                if (dataPO) {
                                    item.purchaseOrderInternal = {
                                        refNo: dataPO.refNo,
                                        artikel: dataPO.artikel,
                                        unit: dataPO.unit
                                    };
                                }

                                if (!ObjectId.isValid(valid._id)) {
                                    var itemError = {};
                                    if (item.pricePerUnit <= 0) {
                                        itemError["pricePerUnit"] = i18n.__("garmentPurchaseCorrection.items.pricePerUnit.isRequired:%s is required", i18n.__("garmentPurchaseCorrection.items.pricePerUnit._:Price Per Unit"));
                                    }

                                    if (item.priceTotal <= 0) {
                                        itemError["priceTotal"] = i18n.__("garmentPurchaseCorrection.items.priceTotal.isRequired:%s is required", i18n.__("garmentPurchaseCorrection.items.priceTotal._:Total Price"));
                                    }

                                    var doItem = _deliveryOrder.items.find(i => i.purchaseOrderExternalId.toString() === item.purchaseOrderExternalId.toString());
                                    var fulfillment = doItem.fulfillments.find(fulfillment => fulfillment.purchaseOrderId.toString() === item.purchaseOrderInternalId.toString() && fulfillment.purchaseRequestId.toString() === item.purchaseRequestId.toString() && fulfillment.productId.toString() === item.productId.toString());

                                    if (fulfillment) {
                                        fulfillment.corrections = fulfillment.corrections || [];

                                        if (fulfillment.corrections.length > 0) {
                                            if (valid.correctionType === "Harga Satuan") {
                                                if (item.pricePerUnit === fulfillment.corrections[fulfillment.corrections.length - 1].correctionPricePerUnit) {
                                                    itemError["pricePerUnit"] = i18n.__("garmentPurchaseCorrection.items.pricePerUnit.noChanges:%s doesn't change", i18n.__("garmentPurchaseCorrection.items.pricePerUnit._:Price Per Unit"));
                                                }
                                            }
                                            else if (valid.correctionType === "Harga Total") {
                                                if (item.priceTotal === fulfillment.corrections[fulfillment.corrections.length - 1].correctionPriceTotal) {
                                                    itemError["priceTotal"] = i18n.__("garmentPurchaseCorrection.items.priceTotal.noChanges:%s doesn't change", i18n.__("garmentPurchaseCorrection.items.priceTotal._:Total Price"));
                                                }
                                            }
                                        } else {
                                            if (valid.correctionType === "Harga Satuan") {
                                                if (item.pricePerUnit === fulfillment.pricePerDealUnit) {
                                                    itemError["pricePerUnit"] = i18n.__("garmentPurchaseCorrection.items.pricePerUnit.noChanges:%s doesn't change", i18n.__("garmentPurchaseCorrection.items.pricePerUnit._:Price Per Unit"));
                                                }
                                            }
                                            else if (valid.correctionType === "Harga Total") {
                                                if (item.priceTotal === fulfillment.pricePerDealUnit * item.quantity) {
                                                    itemError["priceTotal"] = i18n.__("garmentPurchaseCorrection.items.priceTotal.noChanges:%s doesn't change", i18n.__("garmentPurchaseCorrection.items.priceTotal._:Total Price"));
                                                }
                                            }
                                        }
                                    }

                                    itemErrors.push(itemError);
                                }
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
                        else {
                            errors["collection"] = i18n.__("garmentPurchaseCorrection.collection.isRequired:%s is required", i18n.__("garmentPurchaseCorrection.collection._:Item"));
                        }
                    }
                    else {
                        errors["collection"] = i18n.__("garmentPurchaseCorrection.collection.isRequired:%s is required", i18n.__("garmentPurchaseCorrection.collection._:Item"));
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.date = new Date(valid.date);
                    valid.deliveryOrderId = new ObjectId(valid.deliveryOrder._id);

                    if (!valid.stamp)
                        valid = new GarmentPurchaseCorrection(valid);

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    _beforeInsert(garmentPurchaseCorrection) {
        garmentPurchaseCorrection.no = generateCode();
        garmentPurchaseCorrection.date = new Date();
        if (garmentPurchaseCorrection.useIncomeTax || garmentPurchaseCorrection.useVat) {
            garmentPurchaseCorrection.returNoteNo = generateCode("returNoteNo");
        }
        return Promise.resolve(garmentPurchaseCorrection);
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((purchasePriceCorrection) => {
                return this.updateDeliveryOrder(purchasePriceCorrection);
            })
            .then((purchasePriceCorrection) => {
                return this.updatePOInternal(purchasePriceCorrection);
            })
            .then(() => {
                return Promise.resolve(id);
            });
    }

    updateDeliveryOrder(purchasePriceCorrection) {
        return this.deliveryOrderManager.getSingleById(purchasePriceCorrection.deliveryOrderId)
            .then((deliveryOrder) => {
                for (var correction of purchasePriceCorrection.items) {
                    var purchaseOrderExternalId = correction.purchaseOrderExternalId;
                    var doItem = deliveryOrder.items.find(item => item.purchaseOrderExternalId.toString() === purchaseOrderExternalId.toString());
                    var fulfillment = doItem.fulfillments.find(fulfillment => fulfillment.purchaseOrderId.toString() === correction.purchaseOrderInternalId.toString() && fulfillment.purchaseRequestId.toString() === correction.purchaseRequestId.toString() && fulfillment.productId.toString() === correction.productId.toString());

                    if (fulfillment) {
                        fulfillment.corrections = fulfillment.corrections || [];

                        var _correction = {
                            correctionDate: purchasePriceCorrection.date,
                            correctionNo: purchasePriceCorrection.no,
                            correctionType: purchasePriceCorrection.correctionType,
                            correctionQuantity: correction.quantity,
                            correctionPricePerUnit: correction.pricePerUnit,
                            correctionPriceTotal: correction.priceTotal
                        };

                        fulfillment.corrections.push(_correction);
                    }
                }

                return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder)
                    .then((result) => {
                        return Promise.resolve(purchasePriceCorrection);
                    })
            });
    }

    updatePOInternal(purchasePriceCorrection) {
        var correctionItems = purchasePriceCorrection.items.map((item) => {
            return {
                purchaseOrderId: item.purchaseOrderInternalId,
                correctionNo: purchasePriceCorrection.no,
                correctionDate: purchasePriceCorrection.date,
                correctionType: purchasePriceCorrection.correctionType,
                currencyRate: item.currencyRate,
                quantity: item.quantity,
                deliveryOrderNo: purchasePriceCorrection.deliveryOrder.no,
                pricePerUnit: item.pricePerUnit,
                priceTotal: item.priceTotal,
                productId: item.productId,
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
                        var poItem = purchaseOrder.items.find(item => item.product._id.toString() === productId.toString());
                        var fulfillment = poItem.fulfillments.find((fulfillment) => correction.deliveryOrderNo === fulfillment.deliveryOrderNo)

                        if (fulfillment) {
                            fulfillment.corrections = fulfillment.corrections || [];

                            var oldPricePerUnit = 0,
                                newPricePerUnit = correction.pricePerUnit,
                                oldPriceTotal = 0,
                                newPriceTotal = correction.priceTotal;

                            if (fulfillment.corrections.length > 0) {
                                oldPricePerUnit = fulfillment.corrections[fulfillment.corrections.length - 1].newPricePerUnit;
                                oldPriceTotal = fulfillment.corrections[fulfillment.corrections.length - 1].newPriceTotal;
                            } else {
                                oldPricePerUnit = poItem.pricePerDealUnit;
                                oldPriceTotal = poItem.pricePerDealUnit * correction.quantity;
                            }

                            var _correction = {
                                correctionNo: correction.correctionNo,
                                correctionDate: correction.correctionDate,
                                correctionType: correction.correctionType,
                                currencyRate: correction.currencyRate,
                                oldCorrectionQuantity: correction.quantity,
                                newCorrectionQuantity: correction.quantity,
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
            return Promise.resolve(purchasePriceCorrection);
        })
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false,
            $or: [
                { correctionType: "Harga Satuan" },
                { correctionType: "Harga Total" }
            ]
        },
            keywordFilter = {};

        var query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterNo = {
                'no': {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterNo]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
    }

    pdf(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(garmentPurchaseCorrection => {
                    var getDefinition = require('../../pdf/definitions/garment-purchase-price-correction');

                    var definition = getDefinition(garmentPurchaseCorrection, offset);
                    var generatePdf = require('../../pdf/pdf-generator');
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

    getPdfReturNotePph(id, offset) {
        return new Promise((resolve, reject) => {
            this.getSingleById(id)
                .then(purchasePriceCorrection => {
                    var getDefinitionPph = require('../../pdf/definitions/garment-purchase-correction-retur-pph-note');
                    var getPOInternal = [];
                    var deliveryOrderItems = [];

                    for (var _item of purchasePriceCorrection.items) {
                        if (ObjectId.isValid(_item.purchaseOrderInternalId)) {
                            var poId = new ObjectId(_item.purchaseOrderInternalId);
                            getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(poId, ["no", "items.pricePerDealUnit", "items.product", "items.fulfillments"]));
                        }
                    }

                    Promise.all(getPOInternal)
                        .then(purchaseOrders => {
                            var listInvoice = [];
                            for (var purchaseOrder of purchaseOrders) {
                                for (var item of purchaseOrder.items) {
                                    for (var fulfillment of item.fulfillments) {
                                        listInvoice.push({
                                            deliveryOrderNo: fulfillment.deliveryOrderNo,
                                            purchaseOrderNo: purchaseOrder.no,
                                            invoiceNo: fulfillment.invoiceNo || "",
                                            invoiceVatNo: fulfillment.invoiceVatNo,
                                            invoiceVat: fulfillment.invoiceVat,
                                            product: item.product.code,
                                            pricePerDealUnit: item.pricePerDealUnit,
                                            deliveredQuantity: fulfillment.deliveryOrderDeliveredQuantity
                                        })
                                    }
                                }
                            }

                            for (var item of purchasePriceCorrection.items) {
                                var inv = listInvoice.find(invoice => invoice.deliveryOrderNo === purchasePriceCorrection.deliveryOrder.no && invoice.purchaseOrderNo === item.purchaseOrderInternalNo && invoice.product === item.product.code);
                                item.invoiceNo = inv.invoiceNo || "";
                                item.invoiceVatNo = inv.invoiceVatNo;
                                item.invoiceVat = inv.invoiceVat;

                                var doItem = purchasePriceCorrection.deliveryOrder.items.find(i => i.purchaseOrderExternalId.toString() === item.purchaseOrderExternalId.toString());
                                var fulfillment = doItem.fulfillments.find(fulfillment => fulfillment.purchaseOrderId.toString() === item.purchaseOrderInternalId.toString() && fulfillment.purchaseRequestId.toString() === item.purchaseRequestId.toString() && fulfillment.productId.toString() === item.productId.toString());

                                fulfillment.corrections = fulfillment.corrections || [];

                                var pricePerUnit = 0,
                                    priceTotal = 0;

                                if (fulfillment.corrections.length > 0) {
                                    item.priceCorrection = fulfillment.corrections[fulfillment.corrections.length - 1].correctionPricePerUnit - item.pricePerUnit;
                                    item.totalCorrection = fulfillment.corrections[fulfillment.corrections.length - 1].correctionPriceTotal - item.priceTotal;
                                }
                                else {
                                    item.priceCorrection = fulfillment.pricePerDealUnit - item.pricePerUnit;
                                    item.totalCorrection = (fulfillment.pricePerDealUnit * fulfillment.quantity) - item.priceTotal;
                                }

                            }
                            var invoiceVat = listInvoice.find(invoice => invoice.deliveryOrderNo === purchasePriceCorrection.deliveryOrder.no && invoice.invoiceVat != null);
                            purchasePriceCorrection.invoiceVat = invoiceVat.invoiceVat;
                            purchasePriceCorrection.invoiceVatNo = invoiceVat.invoiceVatNo;


                            var definitionPPh = getDefinitionPph(purchasePriceCorrection, offset);
                            var generatePdf = require('../../pdf/pdf-generator');
                            generatePdf(definitionPPh)
                                .then(binary => {
                                    resolve(binary);
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        });
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    getPdfReturNotePpn(id, offset) {
        return new Promise((resolve, reject) => {
            this.getSingleById(id)
                .then(purchasePriceCorrection => {
                    var getDefinitionPpn = require('../../pdf/definitions/garment-purchase-correction-retur-ppn-note');
                    var getPOInternal = [];
                    var deliveryOrderItems = [];

                    for (var _item of purchasePriceCorrection.items) {
                        if (ObjectId.isValid(_item.purchaseOrderInternalId)) {
                            var poId = new ObjectId(_item.purchaseOrderInternalId);
                            getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(poId, ["no", "items.product", "items.pricePerDealUnit", "items.fulfillments"]));
                        }
                    }

                    Promise.all(getPOInternal)
                        .then(purchaseOrders => {
                            var listInvoice = [];
                            for (var purchaseOrder of purchaseOrders) {
                                for (var item of purchaseOrder.items) {
                                    for (var fulfillment of item.fulfillments) {
                                        listInvoice.push({
                                            deliveryOrderNo: fulfillment.deliveryOrderNo,
                                            purchaseOrderNo: purchaseOrder.no,
                                            invoiceNo: fulfillment.invoiceNo || "",
                                            invoiceIncomeTaxNo: fulfillment.invoiceIncomeTaxNo || "",
                                            product: item.product.code,
                                            pricePerDealUnit: item.pricePerDealUnit,
                                            deliveredQuantity: fulfillment.deliveryOrderDeliveredQuantity
                                        })
                                    }
                                }
                            }

                            for (var item of purchasePriceCorrection.items) {
                                var inv = listInvoice.find(invoice => invoice.deliveryOrderNo === purchasePriceCorrection.deliveryOrder.no && invoice.purchaseOrderNo === item.purchaseOrderInternalNo && invoice.product === item.product.code);
                                item.invoiceNo = inv.invoiceNo || "";
                                item.invoiceVatNo = inv.invoiceVatNo;
                                item.invoiceVat = inv.invoiceVat;

                                var doItem = purchasePriceCorrection.deliveryOrder.items.find(i => i.purchaseOrderExternalId.toString() === item.purchaseOrderExternalId.toString());
                                var fulfillment = doItem.fulfillments.find(fulfillment => fulfillment.purchaseOrderId.toString() === item.purchaseOrderInternalId.toString() && fulfillment.purchaseRequestId.toString() === item.purchaseRequestId.toString() && fulfillment.productId.toString() === item.productId.toString());

                                fulfillment.corrections = fulfillment.corrections || [];

                                var pricePerUnit = 0,
                                    priceTotal = 0;

                                if (fulfillment.corrections.length > 0) {
                                    item.priceCorrection = fulfillment.corrections[fulfillment.corrections.length - 1].correctionPricePerUnit - item.pricePerUnit;
                                    item.totalCorrection = fulfillment.corrections[fulfillment.corrections.length - 1].correctionPriceTotal - item.priceTotal;
                                }
                                else {
                                    item.priceCorrection = fulfillment.pricePerDealUnit - item.pricePerUnit;
                                    item.totalCorrection = (fulfillment.pricePerDealUnit * fulfillment.quantity) - item.priceTotal;
                                }

                            }
                            var invoiceIncomeTax = listInvoice.find(invoice => invoice.deliveryOrderNo === purchasePriceCorrection.deliveryOrder.no);
                            purchasePriceCorrection.invoiceIncomeTaxNo = invoiceIncomeTax.invoiceIncomeTaxNo;

                            var definitionPpn = getDefinitionPpn(purchasePriceCorrection, offset);
                            var generatePdf = require('../../pdf/pdf-generator');
                            var generator = [];
                            generatePdf(definitionPpn)
                                .then(binary => {
                                    resolve(binary);
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        });
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    getPurchasePriceCorrectionReport(query, user) {
        return new Promise((resolve, reject) => {

            var deletedQuery = { _deleted: false };
            var correctionTypeQuery = { correctionType: { $regex: /Harga/ } };
            var userQuery = { _createdBy: user.username };


            var date = new Date();
            var dateString = moment(date).format('YYYY-MM-DD');
            var dateNow = new Date(dateString);
            var dateBefore = dateNow.setDate(dateNow.getDate() - 30);
            var _dateFrom = new Date(query.dateFrom);
            var _dateTo = new Date(query.dateTo + "T23:59");
            _dateFrom.setHours(_dateFrom.getHours() - query.offset);
            _dateTo.setHours(_dateTo.getHours() - query.offset);
            var dateQuery = {
                "date": {
                    "$gte": (!query || !query.dateFrom ? (new Date(dateBefore)) : (new Date(_dateFrom))),
                    "$lte": (!query || !query.dateTo ? date : (new Date(_dateTo)))
                }
            };

            var noQuery = {};
            if (query.no) {
                noQuery = {
                    "no": (query.no)
                };
            }

            var supplierQuery = {};
            if (query.supplier) {
                supplierQuery = {
                    "deliveryOrder.supplier.code": (query.supplier)
                };
            }


            var Query = { "$and": [userQuery, dateQuery, deletedQuery, supplierQuery, noQuery, correctionTypeQuery] };
            this.collection
                .aggregate([

                    { "$unwind": "$deliveryOrder" }
                    , { "$unwind": "$deliveryOrder.items" }
                    , { "$unwind": "$items" }
                    , { "$unwind": "$deliveryOrder.items.fulfillments" }
                    , { $match: Query }

                    , {
                        "$project": {
                            "no": "$no",
                            "date": 1,
                            "correctionType": "$correctionType",
                            "currrencyCode": "$currency.code",
                            "deliveryorderNo": "$deliveryOrder.no",
                            "supplier": "$deliveryOrder.supplier.name",
                            "noPOEks": "$items.purchaseOrderExternalNo",
                            "noPR": "$items.purchaseRequestNo",
                            "noRefPR": "$items.purchaseRequestRefNo",
                            "noRO": "$items.roNo",
                            "itemCode": "$items.product.code",
                            "itemName": "$items.product.name",
                            "qty": "$items.quantity",
                            "unitCode": "$items.uom.unit",
                            "pricePerUnit": "$items.pricePerUnit",
                            "priceTotal": "$items.priceTotal",
                            "currencyCode": "$items.currency.code",
                            "deliveredQty": "$deliveryOrder.items.fulfillments.deliveredQuantity",
                            "fulfillments": "$deliveryOrder.items.fulfillments",
                            "itemsProdId": "$items.purchaseOrderInternalId",
                            "fulProdId": "$deliveryOrder.items.fulfillments.purchaseOrderId"

                        }
                    },

                    {
                        "$sort": {
                            "date": -1,
                        }
                    },

                ])
                .toArray()
                .then(results => {
                    resolve(results);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }


       getAllData(startdate, enddate, offset) {
        return new Promise((resolve, reject) => {
            var now = new Date();
            var deleted = {
                _deleted: false
            };
            var query = [deleted];

            var jenis = {
                "correctionType": { $ne: "Jumlah" }
            };
            var query = [jenis];

            var validStartDate = new Date(startdate);
            var validEndDate = new Date(enddate);

            if (startdate && enddate) {
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
                var filterDate = {
                    "_createdDate": {
                        $gte: validStartDate,
                        $lte: validEndDate
                    }
                };
                query.push(filterDate);
            }
            else if (!startdate && enddate) {
                validEndDate.setHours(validEndDate.getHours() - offset);
                var filterDateTo = {
                    "_createdDate": {
                        $gte: now,
                        $lte: validEndDate
                    }
                };
                query.push(filterDateTo);
            }
            else if (startdate && !enddate) {
                validStartDate.setHours(validStartDate.getHours() - offset);
                var filterDateFrom = {
                    "_createdDate": {
                        $gte: validStartDate,
                        $lte: now
                    }
                };
                query.push(filterDateFrom);
            }

            var match = { '$and': query };

            this.collection.aggregate([
                { $match: match },
                { $unwind: "$deliveryOrder.items" },
                { $unwind: "$deliveryOrder.items.fulfillments" },
                { $unwind: "$items" },
                {
                    $project: {
                        "NoNK": "$no",
                        "TgNK": "$date",
                        "Jenis": "$correctionType",
                        "Ketr": "$remark",
                        "MtUang": "$items.currency.code",
                        "Rate": "$items.currencyRate",
                        "KdSpl": "$deliveryOrder.supplier.code",
                        "NmSpl": "$deliveryOrder.supplier.name",
                        "NoSJ": "$deliveryOrder.no",
                        "TgSJ": "$deliveryOrder.supplierDoDate",
                        "TgDtg": "$deliveryOrder.date",
                        "QtySJ": "$deliveryOrder.items.fulfillments.quantity",
                        "TotSJ": "$deliveryOrder.items.fulfillments.priceTotal",
                        "POExt": "$items.purchaseOrderExternalNo",
                        "NoPR": "$items.purchaseRequestNo",
                        "PlanPO": "$items.purchaseRequestRefNo",
                        "NoRO": "$items.roNo",
                        "KdBrg": "$items.product.code",
                        "NmBrg": "$items.product.name",
                        "Qty": "$items.quantity",
                        "Satuan": "$items.uom.unit",
                        "Harga": "$items.pricePerUnit",
                        "Total": "$items.priceTotal",
                        "TgIn": "$_createdDate",
                        "UserIn": "$_createdBy",
                        "TgEd": "$_updatedDate",
                        "UserEd": "$_updatedBy",
                        "itemsProdId": "$items.purchaseOrderInternalId",
                        "fulProdId": "$deliveryOrder.items.fulfillments.purchaseOrderId"
                    }
                },
                {
                    $group: {
                        _id: {
                            "NoNK": "$NoNK", "TgNK": "$TgNK", "Jenis": "$Jenis", "Ketr": "$Ketr", "MtUang": "$MtUang","Rate": "$Rate", 
                            "KdSpl": "$KdSpl", "NmSpl": "$NmSpl", "NoSJ": "$NoSJ", "TgSJ": "$TgSJ", "TgDtg": "$TgDtg", 
                            "QtySJ": "$QtySJ", "TotSJ": "$TotSJ", "POExt": "$POExt", "NoPR": "$NoPR", "PlanPO": "$PlanPO", "NoRO": "$NoRO",
                            "KdBrg": "$KdBrg", "NmBrg": "$NmBrg","Satuan": "$Satuan", "Qty": "$Qty", "Harga": "$Harga", 
                            "Total": "$Total",  "TgIn": "$TgIn", "UserIn": "$UserIn", "TgEd": "$TgEd", "UserEd": "$UserEd","itemsProdId": "$itemsProdId", "fulProdId": "$fulProdId"
                        }
                    }
                }
            ])
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    console.log(result);
                    resolve(result);
                });
        });
    }

    getPurchasePriceCorrectionReportXls(dataReport, query) {

        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            xls.options = [];
            xls.name = '';

            var dateFormat = "DD/MM/YYYY";
            var index = 1;
            for (var data of dataReport.data) {
                var item = {};
                var a = (data.itemsProdId).toString();
                var b = new ObjectId(data.fulProdId);
                if (data.itemsProdId.toString() === data.fulProdId) {
                    item["No"] = index;
                    item["No Koreksi Harga"] = data.no;
                    item["Tanggal Koreksi Harga"] = data.date ? moment(new Date(data.date)).add(query.offset, 'h').format(dateFormat) : '';
                    item["Jenis Koreksi"] = data.correctionType ? data.correctionType : '';
                    item["Surat Jalan"] = data.deliveryorderNo ? data.deliveryorderNo : '';
                    item["Supplier"] = data.supplier ? data.supplier : '';
                    item["Nomor PO Eksternal"] = data.noPOEks ? data.noPOEks : '';
                    item["No PR"] = data.noPR ? data.noPR : '';
                    item["No Ref PR"] = data.noRefPR ? data.noRefPR : '';
                    item["No RO"] = data.noRO ? data.noRO : '';
                    item["Kode Barang"] = data.itemCode ? data.itemCode : '';
                    item["Nama Barang"] = data.itemName ? data.itemName : '';
                    var correction = data.fulfillments.corrections ? data.fulfillments.corrections : data.fulfillments.correction;
                    if (!correction.length) {
                        item["Jumlah Awal"] = data.fulfillments.deliveredQuantity;
                    } else {
                        item["Jumlah Awal"] = correction[correction.length - 1].correctionQuantity;

                    }
                    if (!correction.length) {
                        item["Harga Satuan Awal"] = data.fulfillments.pricePerDealUnit;
                    } else {
                        item["Harga Satuan Awal"] = correction[correction.length - 1].correctionPricePerUnit;
                    }
                    if (!correction.length) {
                        item["Harga Total Awal"] = data.fulfillments.pricePerDealUnit * data.fulfillments.deliveredQuantity;
                    } else {
                        item["Harga Total Awal"] = correction[correction.length - 1].correctionPriceTotal;
                    }
                    item["Jumlah Akhir"] = data.qty ? data.qty : '';
                    item["Satuan"] = data.unitCode ? data.unitCode : '';
                    item["Harga Satuan Akhir"] = data.pricePerUnit ? data.pricePerUnit : '';
                    item["Harga Total Akhir"] = data.priceTotal ? data.priceTotal : '';
                    item["Mata Uang"] = data.currencyCode ? data.currencyCode : '';
                    xls.data.push(item);
                    index++;
                }
            }

            xls.options["No Bon Terima Unit"] = "string";
            xls.options["No Koreksi Harga"] = "string";
            xls.options["Tanggal Koreksi Harga"] = "string";
            xls.options["Jenis Koreksi"] = "string";
            xls.options["Surat Jalan"] = "string";
            xls.options["Supplier"] = "string";
            xls.options["Nomor PO Eksternal"] = "string";
            xls.options["No PR"] = "string";
            xls.options["No Ref PR"] = "string";
            xls.options["No RO"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Jumlah Awal"] = "number";
            xls.options["Harga Satuan Awal"] = "number";
            xls.options["Harga Total Awal"] = "number";
            xls.options["Jumlah Akhir"] = "number";
            xls.options["Harga Satuan Akhir"] = "number";
            xls.options["Harga Total Akhir"] = "number";
            xls.options["Mata Uang"] = "string";

            if (query.dateFrom && query.dateTo) {
                xls.name = `Purchase Price Correction Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (!query.dateFrom && query.dateTo) {
                xls.name = `Purchase Price Correction Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (query.dateFrom && !query.dateTo) {
                xls.name = `Purchase Price Correction Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
            }
            else
                xls.name = `Purchase Price Correction Report.xlsx`;

            resolve(xls);
        });
    }
}