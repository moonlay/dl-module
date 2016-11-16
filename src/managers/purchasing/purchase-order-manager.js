'use strict'

var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var PurchaseOrder = DLModels.purchasing.PurchaseOrder;
var PurchaseOrderItem = DLModels.purchasing.PurchaseOrderItem;
var PurchaseRequestManager = require('./purchase-request-manager');
var generateCode = require('../../utils/code-generator');
var BaseManager = require('../base-manager');
var i18n = require('dl-i18n');

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
        return new Promise((resolve, reject) => {
            var valid = purchaseOrder;
            valid._id = valid._id || new ObjectId();

            var getPurchaseOrderPromise = this.collection.firstOrDefault({
                "$and": [{
                    _deleted: false
                }, {
                    "purchaseRequestId": new ObjectId(valid.purchaseRequestId)
                }]
            });

            var getPurchaseRequest = valid.purchaseRequestId && valid.purchaseRequestId.toString().trim() != '' ? this.purchaseRequestManager.getSingleByIdOrDefault(valid.purchaseRequestId) : Promise.resolve(null);

            Promise.all([getPurchaseOrderPromise, getPurchaseRequest])
                .then(results => {
                    var _purchaseOrder = results[0] || { _id: new ObjectId() };
                    var _purchaseRequest = results[1];
                    var now = new Date();

                    if (!_purchaseRequest)
                        errors["purchaseRequest"] = i18n.__("PurchaseOrder.purchaseRequest.isRequired:%s is required", i18n.__("PurchaseOrder.purchaseRequest._:Purchase Request")); //"purchaseRequest tidak boleh kosong";
                    else if (_purchaseRequest && !_purchaseRequest.isPosted)
                        errors["purchaseRequest"] = i18n.__("PurchaseOrder.purchaseRequest.isPosted:%s is need to be posted", i18n.__("PurchaseOrder.purchaseRequest._:Purchase Request")); //"purchaseRequest harus sudah dipost";
                    else if (valid.sourcePurchaseOrder != null) {
                        if (_purchaseOrder._id.toString() != valid.sourcePurchaseOrder._id.toString() && _purchaseOrder._id.toString() != valid._id.toString() && _purchaseRequest && _purchaseRequest.isPosted && _purchaseRequest.isUsed)
                            errors["purchaseRequest"] = i18n.__("PurchaseOrder.purchaseRequest.isUsed:%s is already used", i18n.__("PurchaseOrder.purchaseRequest._:Purchase Request")); //"purchaseRequest tidak boleh sudah dipakai";
                    } else if (valid.sourcePurchaseOrder == null) {
                        if (_purchaseOrder._id.toString() != valid._id.toString() && _purchaseRequest && _purchaseRequest.isPosted && _purchaseRequest.isUsed)
                            errors["purchaseRequest"] = i18n.__("PurchaseOrder.purchaseRequest.isUsed:%s is already used", i18n.__("PurchaseOrder.purchaseRequest._:Purchase Request")); //"purchaseRequest tidak boleh sudah dipakai";
                    }
                    if (valid.items.length > 0) {
                        var itemErrors = [];
                        for (var item of valid.items) {
                            var itemError = {};

                            if (!item.product || !item.product._id)
                                itemError["product"] = i18n.__("PurchaseOrder.items.product.name.isRequired:%s is required", i18n.__("PurchaseOrder.items.product.name._:Name")); //"Nama barang tidak boleh kosong";
                            if (!item.defaultQuantity || item.defaultQuantity == 0)
                                itemError["defaultQuantity"] = i18n.__("PurchaseOrder.items.defaultQuantity.isRequired:%s is required", i18n.__("PurchaseOrder.items.defaultQuantity._:DefaultQuantity")); //"Jumlah default tidak boleh kosong";

                            if (valid.sourcePurchaseOrder != null) {
                                for (var sourcePoItem of valid.sourcePurchaseOrder.items) {
                                    sourcePoItem.product._id = new ObjectId(sourcePoItem.product._id);
                                    item.product._id = new ObjectId(item.product._id);
                                    if (item.product._id && item.defaultQuantity) {
                                        if (item.product._id.equals(sourcePoItem.product._id)) {
                                            if (item.defaultQuantity > sourcePoItem.defaultQuantity) {
                                                itemError["defaultQuantity"] = i18n.__("PurchaseOrder.items.defaultQuantity.isGreater:%s is greater than the first PO", i18n.__("PurchaseOrder.items.defaultQuantity._:DefaultQuantity")); //"Jumlah default tidak boleh lebih besar dari PO asal";
                                                break;
                                            }
                                        }
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
                    else {
                        errors["items"] = i18n.__("PurchaseOrder.items.isRequired:%s is required", i18n.__("PurchaseOrder.items._:Items")); //"Harus ada minimal 1 barang";
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
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
                        valid.date = _purchaseRequest.date;
                        valid.expectedDeliveryDate = _purchaseRequest.expectedDeliveryDate;
                        for (var poItem of valid.items) {
                            for (var _prItem of _purchaseRequest.items)
                                if (_prItem.product._id.toString() == poItem.product._id.toString()) {
                                    poItem.product = _prItem.product;
                                    poItem.defaultUom = _prItem.uom;
                                    break;
                                }
                        }
                        // valid.items = items;
                    }

                    if (!valid.stamp)
                        valid = new PurchaseOrder(valid);

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })

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

    _createIndexes() {
        var createdDateIndex = {
            name: `ix_${map.master.collection.PurchaseOrder}__createdDate`,
            key: {
                _createdDate: -1
            }
        }
        var poNoIndex = {
            name: `ix_${map.master.collection.PurchaseOrder}_no`,
            key: {
                no: -1
            },
            unique: true
        }

        return this.collection.createIndexes([createdDateIndex, poNoIndex]);
    }

    create(purchaseOrder) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    purchaseOrder.no = `${this.moduleId}${this.year}${generateCode()}`;
                    this._validate(purchaseOrder)
                        .then(validPurchaseOrder => {
                            this.purchaseRequestManager.getSingleById(validPurchaseOrder.purchaseRequest._id)
                                .then(PR => {
                                    PR.isUsed = true;
                                    validPurchaseOrder.purchaseRequest = PR;
                                    this.purchaseRequestManager.update(PR)
                                        .then(results => {
                                            this.collection.insert(validPurchaseOrder)
                                                .then(id => {
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

    delete(purchaseOrder) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(purchaseOrder)
                        .then(validData => {
                            validData._deleted = true;
                            this.collection.update(validData)
                                .then(id => {
                                    this.purchaseRequestManager.getSingleById(validData.purchaseRequest._id)
                                        .then(PR => {
                                            PR.isUsed = false;
                                            this.purchaseRequestManager.update(PR)
                                                .then(results => {
                                                    resolve(id);
                                                })
                                                .catch(e => {
                                                    reject(e);
                                                });
                                        })
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

    split(purchaseOrder) {
        return new Promise((resolve, reject) => {
            this.getSingleById(purchaseOrder.sourcePurchaseOrderId)
                .then(_purchaseOrder => {
                    purchaseOrder.sourcePurchaseOrder = _purchaseOrder;
                    purchaseOrder.sourcePurchaseOrderId = _purchaseOrder._id;
                    this._validate(purchaseOrder)
                        .then(validPurchaseOrder => {
                            delete validPurchaseOrder._id;
                            this.create(validPurchaseOrder)
                                .then(id => {
                                    this.getSingleById(validPurchaseOrder.sourcePurchaseOrder._id)
                                        .then(sourcePo => {
                                            for (var item of validPurchaseOrder.items) {
                                                for (var sourceItem of sourcePo.items) {
                                                    if (item.product.code == sourceItem.product.code) {
                                                        sourceItem.defaultQuantity = sourceItem.defaultQuantity - item.defaultQuantity;
                                                        break;
                                                    }
                                                }
                                            }

                                            sourcePo.items = sourcePo.items.filter((item, index) => {
                                                return item.defaultQuantity > 0;
                                            })

                                            this.update(sourcePo)
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
                        })
                        .catch(e => {
                            reject(e);
                        })
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

    getDataPOMonitoringPembelian(unitId, categoryId, PODLNo, PRNo, supplierId, dateFrom, dateTo) {
        return new Promise((resolve, reject) => {
            var sorting = {
                "purchaseRequest.date": -1,
                "purchaseRequest.no": 1
            };
            var query = {};
            if (unitId != "undefined" && unitId != "" && categoryId != "undefined" && categoryId != "" && PODLNo != "undefined" && PODLNo != "" && PRNo != "undefined" && PRNo != "" && supplierId != "undefined" && supplierId != "" && dateFrom != "undefined" && dateFrom != "" && dateFrom != "null" && dateTo != "undefined" && dateTo != "" && dateTo != "null") {
                query = {
                    unitId: new ObjectId(unitId),
                    categoryId: new ObjectId(categoryId),
                    "purchaseOrderExternal.no": PODLNo,
                    "purchaseRequest.no": PRNo,
                    supplierId: new ObjectId(supplierId),
                    date: {
                        $gte: dateFrom,
                        $lte: dateTo
                    }
                };
            }
            else if (unitId != "undefined" && unitId != "" && categoryId != "undefined" && categoryId != "" && PODLNo != "undefined" && PODLNo != "" && PRNo != "undefined" && PRNo != "" && supplierId != "undefined" && supplierId != "") {
                query = {
                    unitId: new ObjectId(unitId),
                    categoryId: new ObjectId(categoryId),
                    "purchaseOrderExternal.no": PODLNo,
                    "purchaseRequest.no": PRNo,
                    supplierId: new ObjectId(supplierId)
                };
            }
            else if (unitId != "undefined" && unitId != "" && categoryId != "undefined" && categoryId != "" && PODLNo != "undefined" && PODLNo != "" && PRNo != "undefined" && PRNo != "") {
                query = {
                    unitId: new ObjectId(unitId),
                    categoryId: new ObjectId(categoryId),
                    "purchaseOrderExternal.no": PODLNo,
                    "purchaseRequest.no": PRNo
                };
            }
            else if (unitId != "undefined" && unitId != "" && categoryId != "undefined" && categoryId != "" && PODLNo != "undefined") {
                query = {
                    unitId: new ObjectId(unitId),
                    categoryId: new ObjectId(categoryId),
                    "purchaseOrderExternal.no": PODLNo
                };
            }
            else if (unitId != "undefined" && unitId != "" && categoryId != "undefined" && categoryId != "") {
                query = {
                    unitId: new ObjectId(unitId),
                    categoryId: new ObjectId(categoryId)
                };
            }
            else
                if (unitId != "undefined" && unitId != "") {
                    query = {
                        unitId: new ObjectId(unitId)
                    };
                }
                else if (categoryId != "undefined" && categoryId != "") {
                    query = {
                        categoryId: new ObjectId(categoryId)
                    };
                }
                else if (PODLNo != "undefined" && PODLNo != "") {
                    query = {
                        "purchaseOrderExternal.no": PODLNo
                    };
                }
                else if (PRNo != "undefined" && PRNo != "") {
                    query = {
                        "purchaseRequest.no": PRNo
                    };
                }
                else if (supplierId != "undefined" && supplierId != "") {
                    query = {
                        supplierId: new ObjectId(supplierId)
                    };
                }
                else if (dateFrom != "undefined" && dateFrom != "" && dateFrom != "null" && dateTo != "undefined" && dateTo != "" && dateTo != "null") {
                    query = {
                        date: {
                            $gte: dateFrom,
                            $lte: dateTo
                        }
                    };
                }
            query = Object.assign(query, {
                _createdBy: this.user.username,
                _deleted: false
            });
            this.collection.find(query).sort(sorting).toArray()
                .then(purchaseOrders => {
                    resolve(purchaseOrders);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getDataPOUnit(startdate, enddate) {
        return new Promise((resolve, reject) => {
            if (startdate != undefined && enddate != undefined && startdate != "" && enddate != "") {

                this.collection.aggregate(
                    [{
                        $match: {
                            $and: [{
                                $and: [{
                                    "date": {
                                        $gte: startdate,
                                        $lte: enddate
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
                        console.log(result);
                        resolve(result);
                    });

            }
            else {
                this.collection.aggregate(
                    [{
                        $match: {

                            $and: [{
                                "purchaseOrderExternal.isPosted": true
                            }, {
                                "_deleted": false
                            }]
                        },
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
                        console.log(result);
                        resolve(result);
                    });

            }
        });
    }

    getDataPODetailUnit(startdate, enddate, unit) {
        return new Promise((resolve, reject) => {
            if (startdate != undefined && enddate != undefined && startdate != "" && enddate != "") {
                if (unit == undefined) {
                    this.collection.aggregate(
                        [{
                            $match: {
                                $and: [{
                                    $and: [{
                                        "date": {
                                            $gte: startdate,
                                            $lte: enddate
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
                                _id: "$unit.subDivision",
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
                                                $gte: startdate,
                                                $lte: enddate
                                            }
                                        }, {
                                            "_deleted": false
                                        }]
                                    }, {
                                        "purchaseOrderExternal.isPosted": true
                                    }]
                                }, {
                                    "unit.division": unit
                                }]
                            }
                        }, {
                            $unwind: "$items"
                        }, {
                            $group: {
                                _id: "$unit.subDivision",
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


            }
            else {
                if (unit == undefined) {
                    this.collection.aggregate(
                        [{
                            $match: {
                                $and: [{
                                    "purchaseOrderExternal.isPosted": true
                                }, {
                                    "_deleted": false
                                }]
                            }

                        }, {
                            $unwind: "$items"
                        }, {
                            $group: {
                                _id: "$unit.subDivision",
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
                                        "purchaseOrderExternal.isPosted": true
                                    }, {
                                        "_deleted": false
                                    }]
                                }, {
                                    "unit.division": unit
                                }]
                            }
                        }, {
                            $unwind: "$items"
                        }, {
                            $group: {
                                _id: "$unit.subDivision",
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


            }
        });
    }

    getDataPOCategory(startdate, enddate) {
        return new Promise((resolve, reject) => {
            if (startdate != "undefined" && enddate != "undefined" && startdate != "" && enddate != "") {
                this.collection.aggregate(
                    [{
                        $match: {
                            $and: [{
                                $and: [{
                                    "date": {
                                        $gte: startdate,
                                        $lte: enddate
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

            }
            else {
                this.collection.aggregate(
                    [{
                        $match: {

                            $and: [{
                                "purchaseOrderExternal.isPosted": true
                            }, {
                                "_deleted": false
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

            }
        });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.PurchaseOrder}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.purchasing.collection.PurchaseOrder}_no`,
            key: {
                no: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }
}
