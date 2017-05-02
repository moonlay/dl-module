'use strict'

var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var PurchaseOrder = DLModels.purchasing.PurchaseOrder;
var PurchaseRequest = DLModels.purchasing.PurchaseRequest;
var PurchaseOrderItem = DLModels.purchasing.PurchaseOrderItem;
var PurchaseRequestManager = require('./purchase-request-manager');
var generateCode = require('../../utils/code-generator');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var prStatusEnum = DLModels.purchasing.enum.PurchaseRequestStatus;
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;

module.exports = class PurchaseOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.moduleId = 'PO';
        this.year = (new Date()).getFullYear().toString().substring(2, 4);
        this.collection = this.db.use(map.purchasing.collection.PurchaseOrder);
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
    }

    _validate(purchaseOrder) {
        var errors = {};
        var valid = purchaseOrder;
        var getPurchaseOrder = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            no: valid.no || ""
        });
        var getPurchaseRequest = ObjectId.isValid(valid.purchaseRequestId) ? this.purchaseRequestManager.getSingleByIdOrDefault(valid.purchaseRequestId) : Promise.resolve(null);
        var getSourcePurchaseOrder = ObjectId.isValid(valid.sourcePurchaseOrderId) ? this.getSingleByIdOrDefault(valid.sourcePurchaseOrderId) : Promise.resolve(null);

        return Promise.all([getPurchaseOrder, getPurchaseRequest, getSourcePurchaseOrder])
            .then(results => {
                var _purchaseOrder = results[0];
                var _purchaseRequest = results[1];
                var _sourcePurchaseOrder = results[2];

                if (_purchaseOrder) {
                    errors["no"] = i18n.__("PurchaseOrder.no.isExist:%s is exist", i18n.__("PurchaseOrder.no._:No")); //"purchaseRequest tidak boleh kosong";
                }

                if (!_purchaseRequest) {
                    errors["purchaseRequestId"] = i18n.__("PurchaseOrder.purchaseRequest.isRequired:%s is required", i18n.__("PurchaseOrder.purchaseRequest._:Purchase Request")); //"purchaseRequest tidak boleh kosong";
                }
                else if (!_purchaseRequest.isPosted) {
                    errors["purchaseRequestId"] = i18n.__("PurchaseOrder.purchaseRequest.isNotPosted:%s is need to be posted", i18n.__("PurchaseOrder.purchaseRequest._:Purchase Request")); //"purchaseRequest harus sudah dipost";
                }
                else if (_purchaseRequest.isUsed) {
                    var searchId = valid.sourcePurchaseOrderId || valid._id || "";
                    var poId = (_purchaseRequest.purchaseOrderIds || []).find((id) => {
                        return id.toString() === searchId.toString();
                    });
                    if (!poId) {
                        errors["purchaseRequestId"] = i18n.__("PurchaseOrder.purchaseRequest.isUsed:%s is already used", i18n.__("PurchaseOrder.purchaseRequest._:Purchase Request")); //"purchaseRequest tidak boleh sudah dipakai";
                    }
                }
                // /*
                //     single
                // */
                // else if (!_sourcePurchaseOrder) {
                //     if (_purchaseRequest.isUsed) {
                //         var poId = (_purchaseRequest.purchaseOrderIds || []).find((id) => {});

                //     }
                // }
                // // if (_purchaseOrder._id.toString() === valid._id.toString() && _purchaseRequest.isUsed)
                // //     errors["purchaseRequest"] = i18n.__("PurchaseOrder.purchaseRequest.isUsed:%s is already used", i18n.__("PurchaseOrder.purchaseRequest._:Purchase Request")); //"purchaseRequest tidak boleh sudah dipakai";

                // /*
                //     split
                // */
                // else if (_sourcePurchaseOrder) {
                //     if (_purchaseOrder._id.toString() != valid.sourcePurchaseOrder._id.toString() &&
                //         _purchaseOrder._id.toString() != valid._id.toString() &&
                //         _purchaseRequest.isUsed)
                //         errors["purchaseRequest"] = i18n.__("PurchaseOrder.purchaseRequest.isUsed:%s is already used", i18n.__("PurchaseOrder.purchaseRequest._:Purchase Request")); //"purchaseRequest tidak boleh sudah dipakai";
                // }

                valid.items = valid.items || [];
                if (valid.items.length > 0) {
                    var itemErrors = [];
                    for (var item of valid.items) {
                        var itemError = {};

                        if (!item.product || !item.product._id)
                            itemError["product"] = i18n.__("PurchaseOrder.items.product.name.isRequired:%s is required", i18n.__("PurchaseOrder.items.product.name._:Name")); //"Nama barang tidak boleh kosong";
                        if (!item.defaultQuantity || item.defaultQuantity === 0)
                            itemError["defaultQuantity"] = i18n.__("PurchaseOrder.items.defaultQuantity.isRequired:%s is required", i18n.__("PurchaseOrder.items.defaultQuantity._:DefaultQuantity")); //"Jumlah default tidak boleh kosong";

                        if (_sourcePurchaseOrder) {
                            for (var sourcePoItem of valid.sourcePurchaseOrder.items) {
                                sourcePoItem.product._id = new ObjectId(sourcePoItem.product._id);
                                item.product._id = new ObjectId(item.product._id);
                                if (item.product._id && item.defaultQuantity) {
                                    if (item.product._id.equals(sourcePoItem.product._id)) {
                                        if (valid.items.length == valid.sourcePurchaseOrder.items.length) {

                                            if (item.defaultQuantity >= sourcePoItem.defaultQuantity) {
                                                itemError["defaultQuantity"] = i18n.__("PurchaseOrder.items.defaultQuantity.isGreater:%s cannot be greater than or equal the first PO", i18n.__("PurchaseOrder.items.defaultQuantity._:DefaultQuantity")); //"Jumlah default tidak boleh lebih besar dari PO asal";
                                                break;
                                            }
                                        }
                                        else {

                                            if (item.defaultQuantity > sourcePoItem.defaultQuantity) {
                                                itemError["defaultQuantity"] = i18n.__("PurchaseOrder.items.defaultQuantity.isGreater:%s is greater than the first PO", i18n.__("PurchaseOrder.items.defaultQuantity._:DefaultQuantity")); //"Jumlah default tidak boleh lebih besar dari PO asal";
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
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
                else {
                    errors["items"] = i18n.__("PurchaseOrder.items.isRequired:%s is required", i18n.__("PurchaseOrder.items._:Items")); //"Harus ada minimal 1 barang";
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (_purchaseRequest) {
                    valid.purchaseRequest = _purchaseRequest;
                    valid.purchaseRequestId = new ObjectId(_purchaseRequest._id);
                    valid.refNo = _purchaseRequest.no;
                    valid.unit = _purchaseRequest.unit;
                    valid.unitId = new ObjectId(_purchaseRequest.unit._id);
                    valid.unit._id = new ObjectId(_purchaseRequest.unit._id);
                    valid.category = _purchaseRequest.category;
                    valid.categoryId = new ObjectId(_purchaseRequest.category._id);
                    valid.category._id = new ObjectId(_purchaseRequest.category._id);
                    valid.date = new Date(_purchaseRequest.date);
                    valid.expectedDeliveryDate = new Date(_purchaseRequest.expectedDeliveryDate);
                    for (var poItem of valid.items) {
                        for (var _prItem of _purchaseRequest.items)
                            if (_prItem.product._id.toString() === poItem.product._id.toString()) {
                                poItem.product = _prItem.product;
                                poItem.defaultUom = _prItem.product.uom;
                                break;
                            }
                        poItem.defaultQuantity = Number(poItem.defaultQuantity);
                    }
                }

                if (!valid.stamp) {
                    valid = new PurchaseOrder(valid);
                }

                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        },
            keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterRefPONo = {
                'refNo': {
                    '$regex': regex
                }
            };
            var filterRefPOEksternal = {
                "purchaseOrderExternal.refNo": {
                    '$regex': regex
                }
            };
            var filterPONo = {
                'no': {
                    '$regex': regex
                }
            };
            var filterUnitDivision = {
                "unit.division": {
                    '$regex': regex
                }
            };
            var filterUnitSubDivision = {
                "unit.subDivision": {
                    '$regex': regex
                }
            };
            var filterCategory = {
                "category.name": {
                    '$regex': regex
                }
            };
            var filterStaff = {
                '_createdBy': {
                    '$regex': regex
                }
            };
            var filterBuyerName = {
                "buyer.name": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterRefPONo, filterRefPOEksternal, filterPONo, filterUnitDivision, filterUnitSubDivision, filterCategory, filterBuyerName]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
    }

    _beforeInsert(purchaseOrder) {
        purchaseOrder.no = generateCode();
        purchaseOrder.status = poStatusEnum.CREATED;
        purchaseOrder._createdDate = new Date();
        return Promise.resolve(purchaseOrder);
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((purchaseOrder) => {
                return this.purchaseRequestManager.getSingleById(purchaseOrder.purchaseRequestId)
                    .then((purchaseRequest) => {
                        var purchaseOrderError = {};

                        if (purchaseRequest.purchaseOrderIds.length > 0) {
                            var poId = purchaseRequest.purchaseOrderIds.find((_poId) => _poId.toString() === id.toString());
                            if (poId) {
                                purchaseOrderError["purchaseRequestId"] = i18n.__("purchaseRequest.purchaseOrderIds:%s is already used", i18n.__("purchaseRequest.purchaseOrderIds._:Used"));
                            }
                        } else if (purchaseRequest.isUsed) {
                            purchaseOrderError["purchaseRequestId"] = i18n.__("purchaseRequest.isUsed:%s is already used", i18n.__("purchaseRequest.isUsed._:Used"));
                        }

                        if (Object.getOwnPropertyNames(purchaseOrderError).length > 0) {
                            var ValidationError = require("module-toolkit").ValidationError;
                            return Promise.reject(new ValidationError("data does not pass validation", purchaseOrderError));
                        }

                        if (!purchaseRequest.stamp) {
                            purchaseRequest = new PurchaseRequest(purchaseRequest);
                        }
                        purchaseRequest.stamp(this.user.username, 'manager');
                        return Promise.resolve(purchaseRequest)
                    })
                    .then((purchaseRequest) => {
                        purchaseRequest.isUsed = true;
                        purchaseRequest.status = prStatusEnum.PROCESSING;
                        purchaseRequest.purchaseOrderIds = purchaseRequest.purchaseOrderIds || [];
                        purchaseRequest.purchaseOrderIds.push(id);
                        return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                    })
                    .then((purchaseRequest) => {
                        if (purchaseOrder.purchaseRequestId.toString() === purchaseRequest._id.toString()) {
                            purchaseOrder.purchaseRequest = purchaseRequest
                            return this.updateCollectionPurchaseOrder(purchaseOrder)
                                .then((result) => Promise.resolve(purchaseOrder._id));
                        }
                    });
            })
    }

    delete(purchaseOrder) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this._validate(purchaseOrder)
                    .then(validData => {
                        // validData._deleted = true;
                        return this.collection
                            .updateOne({
                                _id: validData._id
                            }, {
                                $set: { "_deleted": true }
                            })
                            .then((result) => Promise.resolve(validData._id))
                            .then((purchaseOrderId) => {
                                return this.purchaseRequestManager.getSingleById(validData.purchaseRequest._id)
                                    .then(purchaseRequest => {
                                        var poIndex = purchaseRequest.purchaseOrderIds.indexOf(validData._id);
                                        purchaseRequest.purchaseOrderIds.splice(poIndex, 1);
                                        if (purchaseRequest.purchaseOrderIds.length === 0) {
                                            purchaseRequest.isUsed = false;
                                            purchaseRequest.status = prStatusEnum.POSTED;
                                        }
                                        return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                                            .then((result) => Promise.resolve(purchaseOrderId));
                                    })
                            })
                    })
                    .catch(e => {
                        reject(e);
                    });
            })
            .catch(e => {
                reject(e);
            });
    }

    split(splittedPurchaseOrder) {
        return new Promise((resolve, reject) => {
            this.getSingleById(splittedPurchaseOrder.sourcePurchaseOrderId)
                .then(sourcePurchaseOrder => {
                    delete splittedPurchaseOrder._id;
                    delete splittedPurchaseOrder.no;
                    splittedPurchaseOrder.sourcePurchaseOrder = sourcePurchaseOrder;
                    splittedPurchaseOrder.sourcePurchaseOrderId = sourcePurchaseOrder._id;
                    this.create(splittedPurchaseOrder)
                        .then(id => {
                            for (var item of splittedPurchaseOrder.items) {
                                var sourceItem = sourcePurchaseOrder.items.find((_sourceItem) => item.product._id.toString() === _sourceItem.product._id.toString());
                                if (sourceItem) {
                                    sourceItem.defaultQuantity = sourceItem.defaultQuantity - item.defaultQuantity;
                                }
                            }
                            sourcePurchaseOrder.items = sourcePurchaseOrder.items.filter((item, index) => {
                                return item.defaultQuantity > 0;
                            })
                            this.update(sourcePurchaseOrder)
                                .then(results => {
                                    resolve(id);
                                })
                                .catch(e => {
                                    reject(e);
                                });

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

    _getByPR(_purchaseRequestNo) {
        return new Promise((resolve, reject) => {
            if (_purchaseRequestNo === '')
                resolve(null);
            var query = {
                "purchaseRequest.no": _purchaseRequestNo,
                _deleted: false
            };
            this.getSingleByQuery(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getDataPOMonitoringPembelian(unitId, categoryId, PODLNo, PRNo, supplierId, dateFrom, dateTo, state, budgetId, staffName, createdBy) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var query = Object.assign({});

                    if (state !== -1) {
                        Object.assign(query, {
                            "status.value": state
                        });
                    }

                    if (unitId !== "undefined" && unitId !== "") {
                        Object.assign(query, {
                            unitId: new ObjectId(unitId)
                        });
                    }
                    if (categoryId !== "undefined" && categoryId !== "") {
                        Object.assign(query, {
                            categoryId: new ObjectId(categoryId)
                        });
                    }
                    if (PODLNo !== "undefined" && PODLNo !== "") {
                        Object.assign(query, {
                            "purchaseOrderExternal.no": PODLNo
                        });
                    }
                    if (PRNo !== "undefined" && PRNo !== "") {
                        Object.assign(query, {
                            "purchaseRequest.no": PRNo
                        });
                    }
                    if (supplierId !== "undefined" && supplierId !== "") {
                        Object.assign(query, {
                            supplierId: new ObjectId(supplierId)
                        });
                    }
                    if (dateFrom !== "undefined" && dateFrom !== "" && dateFrom !== "null" && dateTo !== "undefined" && dateTo !== "" && dateTo !== "null") {
                        Object.assign(query, {
                            date: {
                                $gte: new Date(dateFrom),
                                $lte: new Date(dateTo)
                            }
                        });
                    }
                    if (createdBy !== undefined && createdBy !== "") {
                        Object.assign(query, {
                            _createdBy: createdBy
                        });
                    }
                    if (staffName !== undefined && staffName !== "") {
                        Object.assign(query, {
                            _createdBy: staffName
                        });
                    }
                    if (budgetId !== undefined && budgetId !== "undefined" && budgetId !== "") {
                        Object.assign(query, {
                            "purchaseRequest.budgetId": new ObjectId(budgetId)
                        });
                    }
                    query = Object.assign(query, { _deleted: false });
                    this.collection.find(query).toArray()
                        .then(purchaseOrders => {
                            resolve(purchaseOrders);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }

    getDataPOUnit(startdate, enddate) {
        var validStartDate = startdate && startdate !== "" && startdate != "undefined" ? new Date(startdate) : new Date(null);
        var validEndDate = enddate && enddate !== "" && enddate != "undefined" ? new Date(enddate) : new Date();

        return new Promise((resolve, reject) => {
            this.collection.aggregate(
                [{
                    $match: {
                        $and: [{
                            $and: [{
                                "date": {
                                    $gte: validStartDate,
                                    $lte: validEndDate
                                }
                            }, {
                                    "_deleted": false
                                }

                            ]
                        }, {
                                "purchaseOrderExternal.isPosted": true
                            }]

                    }
                }, {
                        $unwind: "$items"
                    }, {
                        $group: {
                            _id: "$unit.division",
                            "pricetotal": {
                                $sum: {
                                    $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"]
                                }
                            }
                        }
                    }]
            )
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    resolve(result);
                });
        });
    }

    getDataPODetailUnit(startdate, enddate, divisiId) {
        var validStartDate = startdate && startdate !== "" && startdate != "undefined" ? new Date(startdate) : new Date(null);
        var validEndDate = enddate && enddate !== "" && enddate != "undefined" ? new Date(enddate) : new Date();

        return new Promise((resolve, reject) => {
            if (divisiId === undefined) {
                this.collection.aggregate(
                    [{
                        $match: {
                            $and: [{
                                $and: [{
                                    "date": {
                                        $gte: validStartDate,
                                        $lte: validEndDate
                                    }
                                }, {
                                        "_deleted": false
                                    }]
                            }, {
                                    "purchaseOrderExternal.isPosted": true
                                }]
                        }

                    }, {
                            $unwind: "$items"
                        }, {
                            $group: {
                                _id: "$unit.name",
                                "pricetotal": {
                                    $sum: {
                                        $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"]
                                    }
                                }
                            }
                        }]
                )
                    .toArray(function (err, result) {
                        assert.equal(err, null);
                        resolve(result);
                    });
            }
            else {
                this.collection.aggregate(
                    [{
                        $match: {
                            $and: [{
                                $and: [{
                                    $and: [{
                                        "date": {
                                            $gte: validStartDate,
                                            $lte: validEndDate
                                        }
                                    }, {
                                            "_deleted": false
                                        }]
                                }, {
                                        "purchaseOrderExternal.isPosted": true
                                    }]
                            }, {
                                    "unit.division._id": new ObjectId(divisiId)
                                }]
                        }
                    }, {
                            $unwind: "$items"
                        }, {
                            $group: {
                                _id: "$unit.name",
                                "pricetotal": {
                                    $sum: {
                                        $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"]
                                    }
                                }
                            }
                        }]
                )
                    .toArray(function (err, result) {
                        assert.equal(err, null);
                        resolve(result);
                    });
            }
        });
    }

    getDataPOCategory(startdate, enddate) {
        var validStartDate = startdate && startdate !== "" && startdate != "undefined" ? new Date(startdate) : new Date(null);
        var validEndDate = enddate && enddate !== "" && enddate != "undefined" ? new Date(enddate) : new Date();

        return new Promise((resolve, reject) => {
            this.collection.aggregate(
                [{
                    $match: {
                        $and: [{
                            $and: [{
                                "date": {
                                    $gte: validStartDate,
                                    $lte: validEndDate
                                }
                            }, {
                                    "_deleted": false
                                }

                            ]
                        }, {
                                "purchaseOrderExternal.isPosted": true
                            }]

                    }
                }, {
                        $unwind: "$items"
                    }, {
                        $group: {
                            _id: "$category.name",
                            "pricetotal": {
                                $sum: {
                                    $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"]
                                }
                            }
                        }
                    }]
            )
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    resolve(result);
                });
        });
    }

    getDataPOUnitCategory(startdate, enddate) {
        var validStartDate = startdate && startdate !== "" && startdate != "undefined" ? new Date(startdate) : new Date(null);
        var validEndDate = enddate && enddate !== "" && enddate != "undefined" ? new Date(enddate) : new Date();

        return new Promise((resolve, reject) => {
            this.collection.aggregate(
                [{
                    $match: {
                        $and: [{
                            $and: [{
                                "date": {
                                    $gte: validStartDate,
                                    $lte: validEndDate
                                }
                            }, {
                                    "_deleted": false
                                }]
                        }, {
                                "isPosted": true
                            }]
                    }

                }, {
                        $unwind: "$items"
                    }, {
                        $group: {
                            _id: { division: "$unit.division.name", unit: "$unit.name", category: "$category.name" },
                            "pricetotal": {
                                $sum: {
                                    $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"]
                                }
                            }
                        }
                    }]
            )
                .sort({ "_id": 1 })
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    resolve(result);
                });
        });
    }

    getDataPOUnitCategory(startdate, enddate, divisi, unit, category, currency) {
        return new Promise((resolve, reject) => {
            var now = new Date();
            var deleted = {
                _deleted: false
            };
            var isPosted = {
                "purchaseOrderExternal.isPosted": true
            };
            var filterDate = {
                "date": {
                    $gte: new Date(startdate),
                    $lte: new Date(enddate)
                }
            };

            var filterDateFrom = {
                "date": {
                    $gte: new Date(startdate),
                    $lte: now
                }
            };

            var filterDateTo = {
                "date": {
                    $gte: now,
                    $lte: new Date(enddate)
                }
            };

            var filterDivisi = {
                "unit.division._id": new ObjectId(divisi)
            };

            var filterUnit = {
                "unit._id": new ObjectId(unit)
            };

            var filterCategory = {
                "category._id": new ObjectId(category)
            };

            var filterCurrency = {
                "currency._id": new ObjectId(currency)
            };
            var query = [deleted, isPosted];
            if (divisi) {
                query.push(filterDivisi);
            }
            if (unit) {
                query.push(filterUnit);
            }
            if (category) {
                query.push(filterCategory);
            }
            if (currency) {
                query.push(filterCurrency);
            }
            if (startdate && enddate) {
                query.push(filterDate);
            }
            else if (!startdate && enddate) {
                query.push(filterDateTo);
            }
            else if (startdate && !enddate) {
                query.push(filterDateFrom);
            }

            var match = { '$and': query };
            this.collection.aggregate(
                [{
                    $match: match

                }, {
                        $unwind: "$items"
                    }, {
                        $group: {
                            _id: { division: "$unit.division.name", unit: "$unit.name", category: "$category.name", currency: "$currency.code" },
                            "pricePerCurrency": {
                                $sum: {
                                    $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity"]
                                }
                            },
                            "pricetotal": {
                                $sum: {
                                    $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"]
                                }
                            }
                        }
                    }]
            ).sort({ "_id": 1 })
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    console.log(result);
                    resolve(result);
                });
        });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.PurchaseOrder}_date`,
            key: {
                date: -1
            }
        };

        var noIndex = {
            name: `ix_${map.purchasing.collection.PurchaseOrder}_no`,
            key: {
                no: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    selectDateById(id) {
        return new Promise((resolve, reject) => {
            var query = { "purchaseRequest._id": ObjectId.isValid(id) ? new ObjectId(id) : {}, "_deleted": false };
            var _select = ["_createdDate", "purchaseRequest._id"];
            this.collection.where(query).select(_select).execute()
                .then((purchaseRequests) => {
                    if (purchaseRequests.data.length > 0) {
                        resolve(purchaseRequests.data[0]);
                    } else {
                        resolve({});
                    }
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    updateCollectionPurchaseOrder(purchaseOrder) {
        if (!purchaseOrder.stamp) {
            purchaseOrder = new PurchaseOrder(purchaseOrder);
        }
        purchaseOrder.stamp(this.user.username, 'manager');
        return this.collection
            .updateOne({
                _id: purchaseOrder._id
            }, {
                $set: purchaseOrder
            })
            .then((result) => { return this.getSingleByIdOrDefault(purchaseOrder._id) });
    }
};