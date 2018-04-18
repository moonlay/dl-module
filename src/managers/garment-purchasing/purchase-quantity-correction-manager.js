'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var PurchaseOrderManager = require('./purchase-order-manager');
var PurchaseOrderExternalManager = require('./purchase-order-external-manager');
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
        this.purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, user);
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

        var createdDateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentPurchaseCorrection}__createdDate`,
            key: {
                _createdDate: -1
            }
        }

        return this.collection.createIndexes([dateIndex, noIndex, createdDateIndex]);
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
                    else if (!_deliveryOrder.hasInvoice)
                        errors["deliveryOrderId"] = i18n.__("PurchaseQuantityCorrection.deliveryOrder.hasInvoice:%s not has invoice", i18n.__("PurchaseQuantityCorrection.deliveryOrder._:Delivery Order"));

                    // if (!valid.date || valid.date == '')
                    //     errors["date"] = i18n.__("PurchaseQuantityCorrection.date.isRequired:%s is required", i18n.__("PurchaseQuantityCorrection.date._:Correction Date"));
                    // if (new Date(valid.date) > now)
                    //     errors["date"] = i18n.__("PurchaseQuantityCorrection.date.isGreater:%s is greater than now", i18n.__("PurchaseQuantityCorrection.date._:Correction Date"));

                    if (valid.items && !ObjectId.isValid(valid._id)) {
                        if (valid.items.length > 0) {
                            var itemErrors = [];

                            for (var item of valid.items) {
                                var itemError = {};
                                if (item.quantity < 0) {
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
        purchaseQuantityCorrection.date = new Date();

        if (purchaseQuantityCorrection.useIncomeTax || purchaseQuantityCorrection.useVat) {
            purchaseQuantityCorrection.returNoteNo = generateCode("returNoteNo");
        }
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
            .then((purchaseQuantityCorrection) => {
                return this.updatePOExternal(purchaseQuantityCorrection);
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
                    // purchaseOrder.isClosed = false;
                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                });
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(purchaseQuantityCorrection);
        })
    }

    updatePOExternal(purchaseQuantityCorrection) {
        var listPurchaseOrderExternalId = purchaseQuantityCorrection.items.map((item) => {
            return item.purchaseOrderExternalId
        });
        listPurchaseOrderExternalId = [].concat.apply([], listPurchaseOrderExternalId);
        var jobs = [];
        for (var purchaseOrderExternalId of listPurchaseOrderExternalId) {
            var job = this.purchaseOrderExternalManager.getSingleById(purchaseOrderExternalId)
                .then((purchaseOrderExternal) => {
                    purchaseOrderExternal.isClosed = false;
                    for (var poeItem of purchaseOrderExternal.items) {
                        var item = purchaseQuantityCorrection.items.find((correctionItem) => correctionItem.purchaseOrderInternalNo === poeItem.poNo)
                        if (item) {
                            poeItem.isClosed = false;
                        }
                    }
                    return this.purchaseOrderExternalManager.update(purchaseOrderExternal);
                })
            jobs.push(job);
        }

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

    getPdfReturNotePph(id, offset) {
        return new Promise((resolve, reject) => {
            this.getSingleById(id)
                .then(purchaseQuantityCorrection => {
                    var getDefinitionPph = require('../../pdf/definitions/garment-purchase-correction-retur-pph-note');
                    var getPOInternal = [];
                    var deliveryOrderItems = [];

                    for (var _item of purchaseQuantityCorrection.items) {
                        if (ObjectId.isValid(_item.purchaseOrderInternalId)) {
                            var poId = new ObjectId(_item.purchaseOrderInternalId);
                            getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(poId, ["no", "items.product", "items.fulfillments"]));
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
                                            deliveredQuantity: fulfillment.deliveryOrderDeliveredQuantity
                                        })
                                    }
                                }
                            }

                            for (var item of purchaseQuantityCorrection.items) {
                                var inv = listInvoice.find(invoice => invoice.deliveryOrderNo === purchaseQuantityCorrection.deliveryOrder.no && invoice.purchaseOrderNo === item.purchaseOrderInternalNo && invoice.product === item.product.code);
                                item.quantityCorrection = inv.deliveredQuantity - item.quantity;
                                item.priceCorrection = item.pricePerUnit;
                                item.totalCorrection = item.quantityCorrection * item.priceCorrection;
                                item.invoiceNo = inv.invoiceNo || "";
                                item.invoiceVatNo = inv.invoiceVatNo;
                                item.invoiceVat = inv.invoiceVat;
                            }
                            var invoiceVat = listInvoice.find(invoice => invoice.deliveryOrderNo === purchaseQuantityCorrection.deliveryOrder.no && invoice.invoiceVat != null);
                            purchaseQuantityCorrection.invoiceVat = invoiceVat.invoiceVat;
                            purchaseQuantityCorrection.invoiceVatNo = invoiceVat.invoiceVatNo;

                            var definitionPPh = getDefinitionPph(purchaseQuantityCorrection, offset);
                            var generatePdf = require('../../pdf/pdf-generator');
                            generatePdf(definitionPPh)
                                .then(binary => {
                                    resolve(binary);
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        })
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    getPdfReturNotePPn(id, offset) {
        return new Promise((resolve, reject) => {
            this.getSingleById(id)
                .then(purchaseQuantityCorrection => {
                    var getDefinitionPpn = require('../../pdf/definitions/garment-purchase-correction-retur-ppn-note');
                    var getPOInternal = [];
                    var deliveryOrderItems = [];

                    for (var _item of purchaseQuantityCorrection.items) {
                        if (ObjectId.isValid(_item.purchaseOrderInternalId)) {
                            var poId = new ObjectId(_item.purchaseOrderInternalId);
                            getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(poId, ["no", "items.product", "items.fulfillments"]));
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
                                            deliveredQuantity: fulfillment.deliveryOrderDeliveredQuantity
                                        })
                                    }
                                }
                            }

                            for (var item of purchaseQuantityCorrection.items) {
                                var inv = listInvoice.find(invoice => invoice.deliveryOrderNo === purchaseQuantityCorrection.deliveryOrder.no && invoice.purchaseOrderNo === item.purchaseOrderInternalNo && invoice.product === item.product.code);
                                item.quantityCorrection = inv.deliveredQuantity - item.quantity;
                                item.priceCorrection = item.pricePerUnit;
                                item.totalCorrection = (item.quantityCorrection) * item.priceCorrection;
                                item.invoiceNo = inv.invoiceNo || "";
                                item.invoiceIncomeTaxNo = inv.invoiceIncomeTaxNo || "";
                            }

                            var invoiceIncomeTax = listInvoice.find(invoice => invoice.deliveryOrderNo === purchaseQuantityCorrection.deliveryOrder.no);
                            purchaseQuantityCorrection.invoiceIncomeTaxNo = invoiceIncomeTax.invoiceIncomeTaxNo;

                            var definitionPpn = getDefinitionPpn(purchaseQuantityCorrection, offset);
                            var generatePdf = require('../../pdf/pdf-generator');
                            generatePdf(definitionPpn)
                                .then(binary => {
                                    resolve(binary);
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        })
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    getPurchaseQuantityCorrectionReport(query, user) {
        return new Promise((resolve, reject) => {

            var deletedQuery = { _deleted: false };
            var correctionTypeQuery = { correctionType: "Jumlah" };
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
                "correctionType": "Jumlah"
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
                        "QtySJ": "$deliveryOrder.items.fulfillments.deliveredQuantity",
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
                        "fulProdId": "$deliveryOrder.items.fulfillments.purchaseOrderId",
                    }
                },
                {
                    $group: {
                        _id: {
                            "NoNK": "$NoNK", "TgNK": "$TgNK", "Jenis": "$Jenis", "Ketr": "$Ketr", "MtUang": "$MtUang",
                            "Rate": "$Rate", "KdSpl": "$KdSpl", "NmSpl": "$NmSpl", "NoSJ": "$NoSJ", "TgSJ": "$TgSJ", 
                            "TgDtg": "$TgDtg", "QtySJ": "$QtySJ", "POExt": "$POExt", "NoPR": "$NoPR", "PlanPO": "$PlanPO",
                            "NoRO": "$NoRO", "KdBrg": "$KdBrg", "NmBrg": "$NmBrg", "Satuan": "$Satuan", "Qty": "$Qty", "Harga": "$Harga",
                            "Total": "$Total", "TgIn": "$TgIn", "UserIn": "$UserIn", "TgEd": "$TgEd", "UserEd": "$UserEd","itemsProdId": "$itemsProdId", "fulProdId": "$fulProdId"
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
    
    getPurchaseQuantityCorrectionReportXls(dataReport, query) {

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
