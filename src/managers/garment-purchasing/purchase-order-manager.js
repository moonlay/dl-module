'use strict'

var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var PurchaseOrder = DLModels.garmentPurchasing.GarmentPurchaseOrder;
var PurchaseRequest = DLModels.garmentPurchasing.GarmentPurchaseRequest;
var PurchaseRequestManager = require('./purchase-request-manager');
var generateCode = require('../../utils/code-generator');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var prStatusEnum = DLModels.purchasing.enum.PurchaseRequestStatus;
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;
var moment = require('moment');

module.exports = class PurchaseOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.moduleId = 'PO';
        this.year = (new Date()).getFullYear().toString().substring(2, 4);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentPurchaseOrder);
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.purchaseOrderFields = [
            "_id",
            "no",
            "refNo",
            "purchaseRequestId",
            "purchaseRequest._id",
            "purchaseRequest.no",
            "date",
            "expectedDeliveryDate",
            "actualDeliveryDate",
            "isPosted",
            "isClosed",
            "remark",
            "status",
            "items.purchaseOrderExternalId",
            "items.purchaseOrderExternal._id",
            "items.purchaseOrderExternal.no",
            "items.supplierId",
            "items.supplier.code",
            "items.supplier.name",
            "items.supplier.address",
            "items.supplier.contact",
            "items.supplier.PIC",
            "items.supplier.import",
            "items.supplier.NPWP",
            "items.supplier.serialNumber",
            "items.unitId",
            "items.unit.code",
            "items.unit.divisionId",
            "items.unit.division",
            "items.unit.name",
            "items.freightCostBy",
            "items.currency.code",
            "items.currency.symbol",
            "items.currency.rate",
            "items.currencyRate",
            "items.paymentMethod",
            "items.paymentDueDays",
            "items.vat",
            "items.useVat",
            "items.vatRate",
            "items.useIncomeTax",
            "items.productId",
            "items.product",
            "items.defaultQuantity",
            "items.defaultUom",
            "items.dealQuantity",
            "items.dealUom",
            "items.realizationQuantity",
            "items.pricePerDealUnit",
            "items.priceBeforeTax",
            "items.budgetPrice",
            "items.categoryId",
            "items.category.code",
            "items.category.name",
            "items.conversion",
            "items.isPosted",
            "items.isClosed",

        ];
    }

    /*getPrice(dateFrom, dateTo, productName) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var query = Object.assign({});


                    if (productName !== "undefined" && productName !== "") {
                        Object.assign(query, {
                            "items.product.name": productName
                        }
                        );
                    }

                    if (dateFrom !== "undefined" && dateFrom !== "" && dateFrom !== "null" && dateTo !== "undefined" && dateTo !== "" && dateTo !== "null") {
                        Object.assign(query, {
                            date: {
                                $gte: new Date(dateFrom),
                                $lte: new Date(dateTo)
                            }
                        });
                    }

                    query = Object.assign(query, { _deleted: false });
                    this.collection.aggregate([{ "$unwind": "$items" }, { "$match": query }, { $sort: { date: 1 } }]).toArray()
                        .then(purchaseOrders => {
                            resolve(purchaseOrders);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }*/

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
                else {
                    if (!_sourcePurchaseOrder && valid.items.length > 0) {
                        var prItem = _purchaseRequest.items.find((item) => item.product._id.toString() === valid.items[0].product._id.toString() && item.id_po.toString() === valid.items[0].id_po.toString())
                        if (prItem) {
                            if (prItem.isUsed) {
                                var searchId = valid.sourcePurchaseOrderId || valid._id || "";
                                var poId = (prItem.purchaseOrderIds || []).find((id) => {
                                    return id.toString() === searchId.toString();
                                });
                                if (!poId) {
                                    errors["purchaseRequestId"] = i18n.__("PurchaseOrder.purchaseRequest.isUsed:%s is already used", i18n.__("PurchaseOrder.purchaseRequest._:Purchase Request")); //"purchaseRequest tidak boleh sudah dipakai";
                                }
                            }
                        }
                    }
                }

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
                            var sourcePoItem = valid.sourcePurchaseOrder.items.find((sourceItem) => sourceItem.product._id.toString() === item.product._id.toString());
                            if (sourcePoItem) {
                                if (valid.items.length == valid.sourcePurchaseOrder.items.length) {
                                    if (item.defaultQuantity >= sourcePoItem.defaultQuantity) {
                                        itemError["defaultQuantity"] = i18n.__("PurchaseOrder.items.defaultQuantity.isGreater:%s cannot be greater than or equal the first PO", i18n.__("PurchaseOrder.items.defaultQuantity._:DefaultQuantity")); //"Jumlah default tidak boleh lebih besar dari PO asal";
                                    }
                                }
                                else {
                                    if (item.defaultQuantity > sourcePoItem.defaultQuantity) {
                                        itemError["defaultQuantity"] = i18n.__("PurchaseOrder.items.defaultQuantity.isGreater:%s is greater than the first PO", i18n.__("PurchaseOrder.items.defaultQuantity._:DefaultQuantity")); //"Jumlah default tidak boleh lebih besar dari PO asal";
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
                    for (var poItem of valid.items) {
                        var _prItem = _purchaseRequest.items.find((item) => { item.product._id.toString() === poItem.product._id.toString() && item.id_po.toString() === poItem.id_po.toString() })
                        if (_prItem) {
                            poItem.product = _prItem.product;
                            poItem.defaultUom = _prItem.uom;
                            poItem.category = _prItem.category;
                            poItem.categoryId = new ObjectId(_prItem.category._id);
                            poItem.defaultQuantity = Number(poItem.defaultQuantity);
                            poItem.budgetPrice = Number(poItem.budgetPrice);
                        }
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
                "items.category.name": {
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

            var filterRoNo = {
                "roNo": {
                    "$regex": regex
                }
            };;

            var filterBuyer = {
                "buyer": {
                    "$regex": regex
                }
            };

            var filterArtikel = {
                "artikel": {
                    "$regex": regex
                }
            };

            keywordFilter = {
                '$or': [filterRefPONo, filterRefPOEksternal, filterPONo, filterUnitDivision, filterUnitSubDivision, filterCategory, filterRoNo, filterBuyer, filterArtikel]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
    }

    getPurchaseOrderByTag(categoryId, keyword, shipmentDate) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var keywords = [];

                    var query = Object.assign({});
                    var queryCategory = {
                        "items.categoryId": new ObjectId(categoryId),
                        "items.isPosted": false,
                        "items.isClosed": false
                    };
                    query = Object.assign(query, {
                        _deleted: false,
                        isClosed: false,
                        isPosted: false
                    });
                    if (keyword) {
                        var keywordFilters = [];
                        if (keyword.indexOf("#") != -1) {
                            keywords = keyword.split("#");
                            keywords = this.cleanUp(keywords);
                        } else {
                            keywords.push(keyword)
                        }
                        for (var _keyword of keywords) {
                            var keywordFilter = {};
                            var regex = new RegExp(_keyword, "i");

                            var filterRoNo = {
                                "roNo": {
                                    "$regex": regex
                                }
                            };

                            var filterBuyer = {
                                "buyer.name": {
                                    "$regex": regex
                                }
                            };

                            var filterArtikel = {
                                "artikel": {
                                    "$regex": regex
                                }
                            };

                            keywordFilters.push(filterRoNo, filterBuyer, filterArtikel);
                        }
                        query['$or'] = keywordFilters;
                    }

                    var _select = {
                        "no": 1,
                        "purchaseRequest.no": 1,
                        "purchaseRequest._id": 1,
                        "roNo": 1,
                        "isPosted": 1,
                        "isUsed": 1,
                        "_createdBy": 1,
                        "year": { $year: "$shipmentDate" },
                        "month": { $month: "$shipmentDate" },
                        "day": { $dayOfMonth: "$shipmentDate" },
                        "items.refNo": 1,
                        "items.product": "$items.product",
                        "items.productId": "$items.productId",
                        "items.defaultQuantity": "$items.defaultQuantity",
                        "items.defaultUom": "$items.defaultUom",
                        "items.budgetPrice": "$items.budgetPrice",
                        "items.isPosted": "$items.isPosted",
                        "items.isClosed": "$items.isClosed",
                        "items.category": "$items.category",
                        "items.categoryId": "$items.categoryId",
                    };

                    var qryMatch = [{ $match: query }, { $unwind: "$items" }, { $match: queryCategory }, { $project: _select }];

                    var queryDate = Object.assign({});
                    if (shipmentDate) {
                        var _shipmentDate = new Date(shipmentDate);

                        queryDate = {
                            year: _shipmentDate.getFullYear(),
                            month: _shipmentDate.getMonth() + 1,
                            day: _shipmentDate.getDate()
                        }
                        qryMatch.push({ $match: queryDate })
                    }

                    this.collection.aggregate(qryMatch).toArray()
                        .then((purchaseOrders) => {
                            resolve(purchaseOrders);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }

    _beforeInsert(purchaseOrder) {
        purchaseOrder.status = poStatusEnum.CREATED;
        purchaseOrder.items.map((item) => item.status = poStatusEnum.CREATED);
        purchaseOrder._createdDate = new Date();
        return Promise.resolve(purchaseOrder);
    }

    /*_afterInsert(id) {
        return this.getSingleById(id)
            .then((purchaseOrder) => {
                return this.purchaseRequestManager.getSingleById(purchaseOrder.purchaseRequestId)
                    .then((purchaseRequest) => {
                        var purchaseOrderError = {};
                        var _prItem = purchaseRequest.items.find((item) => item.product._id.toString() === purchaseOrder.items[0].product._id.toString() && item.id_po.toString() === purchaseOrder.items[0].id_po.toString())
                        _prItem.purchaseOrderIds = _prItem.purchaseOrderIds || [];
                        if (_prItem.purchaseOrderIds.length > 0) {
                            var poId = _prItem.purchaseOrderIds.find((_poId) => _poId.toString() === id.toString());
                            if (poId) {
                                purchaseOrderError["purchaseRequestId"] = i18n.__("purchaseRequest.purchaseOrderIds:%s is already used", i18n.__("purchaseRequest.purchaseOrderIds._:Used"));
                            }
                        } else if (_prItem.isUsed) {
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
                        purchaseRequest.status = prStatusEnum.PROCESSING;
                        var _prItem = purchaseRequest.items.find((item) => item.product._id.toString() === purchaseOrder.items[0].product._id.toString() && item.id_po.toString() === purchaseOrder.items[0].id_po.toString())
                        _prItem.purchaseOrderIds = purchaseRequest.purchaseOrderIds || [];
                        _prItem.purchaseOrderIds.push(id);
                        _prItem.isUsed = true;

                        purchaseRequest.isUsed = purchaseRequest.items
                            .map((item) => item.isUsed)
                            .reduce((prev, curr, index) => {
                                return prev && curr
                            }, true);

                        return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                    })
                    .then((result) => Promise.resolve(purchaseOrder._id));
            })
    }*/

    createMultiple(listPurchaseRequest) {
        var getPurchaseRequests = [];
        var prIds = listPurchaseRequest.map((pr) => { return pr._id.toString() })
        prIds = prIds.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })
        for (var prId of prIds) {
            if (ObjectId.isValid(prId)) {
                getPurchaseRequests.push(this.purchaseRequestManager.getSingleByIdOrDefault(prId));
            }
        }
        return Promise.all(getPurchaseRequests)
            .then((purchaseRequests) => {
                var jobs = [];
                for (var _purchaseRequest of listPurchaseRequest) {
                    var purchaseRequest = purchaseRequests.find((pr) => pr._id.toString() === _purchaseRequest._id.toString());
                    var purchaseOrder = {}
                    purchaseOrder.no = generateCode(_purchaseRequest.items.id_po.toString());
                    purchaseOrder.status = poStatusEnum.CREATED;
                    purchaseOrder._createdDate = new Date();
                    purchaseOrder.refNo = purchaseRequest.no;
                    purchaseOrder.roNo = purchaseRequest.roNo;

                    purchaseOrder.buyerId = purchaseRequest.buyerId;
                    purchaseOrder.buyer = purchaseRequest.buyer;
                    purchaseOrder.artikel = purchaseRequest.artikel;

                    purchaseOrder.purchaseRequestId = purchaseRequest._id;
                    purchaseOrder.purchaseRequest = purchaseRequest;

                    purchaseOrder.unitId = purchaseRequest.unitId;
                    purchaseOrder.unit = purchaseRequest.unit;

                    purchaseOrder.date = purchaseRequest.date;
                    purchaseOrder.expectedDeliveryDate = purchaseRequest.expectedDeliveryDate;
                    purchaseOrder.shipmentDate = purchaseRequest.shipmentDate;

                    purchaseOrder.remark = purchaseRequest.remark;

                    var _items = [];
                    var prItems = purchaseRequest.items.find((item) => item.product._id.toString() === _purchaseRequest.items.productId.toString() && item.id_po.toString() === _purchaseRequest.items.id_po.toString())
                    if (prItems) {
                        var _item = {};
                        _item.refNo = prItems.refNo;
                        _item.product = prItems.product;
                        _item.defaultUom = prItems.uom;
                        _item.defaultQuantity = prItems.quantity;
                        _item.budgetPrice = prItems.budgetPrice;
                        _item.remark = prItems.remark;
                        _item.id_po = prItems.id_po;
                        _item.categoryId = prItems.categoryId;
                        _item.category = prItems.category;
                        _items.push(_item);
                    }
                    purchaseOrder.items = _items;
                    jobs.push(this.create(purchaseOrder));
                }
                return Promise.all(jobs)
                    .then((poIds) => {
                        var getPurchaseOrder = [];
                        for (var poId of poIds) {
                            getPurchaseOrder.push(this.getSingleById(poId, ["_id", "purchaseRequestId", "items.product._id", "items.id_po"]))
                        }
                        return Promise.all(getPurchaseOrder)
                            .then((results) => {
                                var listPurchaseOrders = results.map((poInternal) => {
                                    return poInternal.items.map((item) => {
                                        return {
                                            purchaseOrderId: poInternal._id,
                                            purchaseRequestId: poInternal.purchaseRequestId,
                                            productId: item.product._id,
                                            id_po: item.id_po
                                        }
                                    })
                                })
                                listPurchaseOrders = [].concat.apply([], listPurchaseOrders);
                                var map = new Map();
                                for (var purchaseOrder of listPurchaseOrders) {
                                    var key = purchaseOrder.purchaseRequestId.toString();
                                    if (!map.has(key))
                                        map.set(key, [])
                                    map.get(key).push(purchaseOrder);
                                }

                                var jobs = [];
                                map.forEach((items, purchaseRequestId) => {
                                    var job = this.purchaseRequestManager.getSingleById(purchaseRequestId)
                                        .then((purchaseRequest) => {
                                            for (var item of items) {
                                                var prItem = purchaseRequest.items.find(prItem => prItem.product._id.toString() === item.productId.toString() && prItem.id_po.toString() === item.id_po.toString());
                                                if (prItem) {
                                                    prItem.purchaseOrderIds = prItem.purchaseOrderIds || []
                                                    prItem.purchaseOrderIds.push(item.purchaseOrderId);
                                                    prItem.isUsed = true;
                                                }
                                            }
                                            purchaseRequest.isUsed = purchaseRequest.items
                                                .map((item) => item.isUsed)
                                                .reduce((prev, curr, index) => {
                                                    return prev && curr
                                                }, true);
                                            purchaseRequest.status = prStatusEnum.PROCESSING;
                                            return this.purchaseRequestManager.updateCollectionPR(purchaseRequest);
                                        });
                                    jobs.push(job);
                                })

                                return Promise.all(jobs).then((results) => {
                                    return Promise.resolve(poIds);
                                })
                            })
                    })
            });
    }

    delete(purchaseOrder) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this._validate(purchaseOrder)
                    .then(validData => {
                        return this.collection.updateOne({ _id: validData._id }, { $set: { "_deleted": true } })
                            .then((result) => Promise.resolve(validData._id))
                            .then((purchaseOrderId) => {
                                return this.purchaseRequestManager.getSingleById(validData.purchaseRequest._id)
                                    .then(purchaseRequest => {
                                        for (var item of purchaseRequest.items) {
                                            item.purchaseOrderIds = item.purchaseOrderIds || []
                                            var poId = item.purchaseOrderIds.find((poId) => poId.toString() === validData._id.toString());
                                            if (poId) {
                                                var poIndex = item.purchaseOrderIds.indexOf(poId)
                                                item.purchaseOrderIds.splice(poIndex, 1);
                                                item.isUsed = false;
                                            }
                                        }
                                        purchaseRequest.isUsed = purchaseRequest.items
                                            .map((item) => item.isUsed)
                                            .reduce((prev, curr, index) => {
                                                return prev && curr
                                            }, true);

                                        var cekStatus = purchaseRequest.items
                                            .map((item) => item.isUsed)
                                            .reduce((prev, curr, index) => {
                                                return prev || curr
                                            }, true);
                                        if (!cekStatus) {
                                            purchaseRequest.status = prStatusEnum.POSTED;
                                        }
                                        return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                                            .then((result) => Promise.resolve(purchaseOrderId));
                                    })
                            })
                    })
            })
    }

    split(splittedPurchaseOrder) {
        return new Promise((resolve, reject) => {
            this.getSingleById(splittedPurchaseOrder.sourcePurchaseOrderId)
                .then(sourcePurchaseOrder => {
                    delete splittedPurchaseOrder._id;
                    delete splittedPurchaseOrder.no;

                    splittedPurchaseOrder.no = generateCode();
                    splittedPurchaseOrder.sourcePurchaseOrder = sourcePurchaseOrder;
                    splittedPurchaseOrder.sourcePurchaseOrderId = sourcePurchaseOrder._id;
                    this.create(splittedPurchaseOrder)
                        .then((purchaseOrderId) => {
                            return this.getSingleById(purchaseOrderId, ["_id", "purchaseRequestId", "items.product._id", "items.id_po"])
                                .then((purchaseOrder) => {
                                    return this.purchaseRequestManager.getSingleById(purchaseOrder.purchaseRequestId)
                                        .then(purchaseRequest => {
                                            for (var item of purchaseOrder.items) {
                                                var prItem = purchaseRequest.items.find(prItem => prItem.productId.toString() === item.product._id.toString() && prItem.id_po.toString() === item.id_po.toString());
                                                if (prItem) {
                                                    prItem.purchaseOrderIds = prItem.purchaseOrderIds || []
                                                    prItem.purchaseOrderIds.push(purchaseOrder._id);
                                                    prItem.isUsed = true;
                                                }
                                            }
                                            purchaseRequest.isUsed = purchaseRequest.items
                                                .map((item) => item.isUsed)
                                                .reduce((prev, curr, index) => {
                                                    return prev && curr
                                                }, true);
                                            purchaseRequest.status = prStatusEnum.PROCESSING;
                                            return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                                        })
                                })
                                .then(result => {
                                    for (var item of splittedPurchaseOrder.items) {
                                        var sourceItem = sourcePurchaseOrder.items.find((_sourceItem) => item.product._id.toString() === _sourceItem.product._id.toString());
                                        if (sourceItem) {
                                            sourceItem.defaultQuantity = sourceItem.defaultQuantity - item.defaultQuantity;
                                        }
                                    }
                                    sourcePurchaseOrder.items = sourcePurchaseOrder.items.filter((item, index) => {
                                        return !item.isPosted && item.defaultQuantity > 0;
                                    })
                                    sourcePurchaseOrder.isSplit = true;
                                    this.update(sourcePurchaseOrder)
                                        .then(results => {
                                            resolve(purchaseOrderId);
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

    /*_getByPR(_purchaseRequestNo) {
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
    }*/

    /*getDataPOMonitoringPembelian(unitId, categoryId, PODLNo, PRNo, supplierId, dateFrom, dateTo, state, budgetId, staffName, offset, createdBy) {
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
                        var _dateFrom = new Date(dateFrom);
                        var _dateTo = new Date(dateTo);
                        _dateFrom.setHours(_dateFrom.getHours() - offset);
                        _dateTo.setHours(_dateTo.getHours() - offset);
                        Object.assign(query, {
                            date: {
                                $gte: _dateFrom,
                                $lte: _dateTo
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
    }*/

    /*getDataPOUnit(startdate, enddate, offset) {
        return new Promise((resolve, reject) => {
            var qryMatch = {};
            qryMatch["$and"] = [
                { "_deleted": false },
                { "purchaseOrderExternal.isPosted": true }];
    
            if (startdate && startdate !== "" && startdate != "undefined" && enddate && enddate !== "" && enddate != "undefined") {
                var validStartDate = new Date(startdate);
                var validEndDate = new Date(enddate);
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
    
                qryMatch["$and"].push(
                    {
                        "date": {
                            $gte: validStartDate,
                            $lte: validEndDate
                        }
                    })
            }
            this.collection.aggregate(
                [{
                    $match: qryMatch
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
    }*/

    /*getDataPODetailUnit(startdate, enddate, divisiId, offset) {
        return new Promise((resolve, reject) => {
            var qryMatch = {};
    
            qryMatch["$and"] = [
                { "_deleted": false },
                { "purchaseOrderExternal.isPosted": true }];
    
            if (startdate && startdate !== "" && startdate != "undefined" && enddate && enddate !== "" && enddate != "undefined") {
                var validStartDate = new Date(startdate);
                var validEndDate = new Date(enddate);
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
    
                qryMatch["$and"].push(
                    {
                        "date": {
                            $gte: validStartDate,
                            $lte: validEndDate
                        }
                    })
            }
            if (!divisiId) {
                qryMatch["$and"].push({
                    "unit.division._id": new ObjectId(divisiId)
                })
            }
            this.collection.aggregate(
                [{
                    $match: qryMatch
    
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
        });
    }*/

    /*getDataPOSupplier(startdate, enddate, offset) {
        return new Promise((resolve, reject) => {
            var qryMatch = {};
            qryMatch["$and"] = [
                { "_deleted": false },
                { "purchaseOrderExternal.isPosted": true }];
    
            if (startdate && startdate !== "" && startdate != "undefined" && enddate && enddate !== "" && enddate != "undefined") {
                var validStartDate = new Date(startdate);
                var validEndDate = new Date(enddate);
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
    
                qryMatch["$and"].push(
                    {
                        "date": {
                            $gte: validStartDate,
                            $lte: validEndDate
                        }
                    })
            }
    
            this.collection.aggregate(
                [{
                    $match: qryMatch
                }, {
                        $unwind: "$items"
                    }, {
                        $group: {
                            _id: "$supplier",
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
    }*/

    /*getDataPOSplDetil(startdate, enddate, supplierId, offset) {
        return new Promise((resolve, reject) => {
            var qryMatch = {};
            qryMatch["$and"] = [
                { "_deleted": false },
                { "purchaseOrderExternal.isPosted": true },
                { "supplier._id": new ObjectId(supplierId) }];
    
            if (startdate && startdate !== "" && startdate != "undefined" && enddate && enddate !== "" && enddate != "undefined") {
                var validStartDate = new Date(startdate);
                var validEndDate = new Date(enddate);
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
    
                qryMatch["$and"].push(
                    {
                        "date": {
                            $gte: validStartDate,
                            $lte: validEndDate
                        }
                    })
            }
            this.collection.aggregate(
                [{
                    $match: qryMatch
                }, {
                        $unwind: "$items"
                    }, {
                        $group: {
                            _id: "$purchaseOrderExternal.no",
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
    }*/

    /*getDataPOCategory(startdate, enddate, offset) {
        return new Promise((resolve, reject) => {
            var qryMatch = {};
            qryMatch["$and"] = [
                { "_deleted": false },
                { "purchaseOrderExternal.isPosted": true }];
    
            if (startdate && startdate !== "" && startdate != "undefined" && enddate && enddate !== "" && enddate != "undefined") {
                var validStartDate = new Date(startdate);
                var validEndDate = new Date(enddate);
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
    
                qryMatch["$and"].push(
                    {
                        "date": {
                            $gte: validStartDate,
                            $lte: validEndDate
                        }
                    })
            }
            this.collection.aggregate(
                [{
                    $match: qryMatch
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
    }*/

    /*getDataPOUnitCategory(startdate, enddate, offset) {
        return new Promise((resolve, reject) => {
            var qryMatch = {};
            qryMatch["$and"] = [
                { "_deleted": false },
                { "isPosted": true }];
    
            if (startdate && startdate !== "" && startdate != "undefined" && enddate && enddate !== "" && enddate != "undefined") {
                var validStartDate = new Date(startdate);
                var validEndDate = new Date(enddate);
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
    
                qryMatch["$and"].push(
                    {
                        "date": {
                            $gte: validStartDate,
                            $lte: validEndDate
                        }
                    })
            }
            this.collection.aggregate(
                [{
                    $match: qryMatch
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
    }*/

    /*getDataPOUnitCategory(startdate, enddate, divisi, unit, category, currency, offset) {
        return new Promise((resolve, reject) => {
            var now = new Date();
            var deleted = {
                _deleted: false
            };
            var isPosted = {
                "purchaseOrderExternal.isPosted": true
            };
            var validStartDate = new Date(startdate);
            var validEndDate = new Date(enddate);
    
            var query = [deleted, isPosted];
            if (divisi) {
                var filterDivisi = {
                    "unit.division._id": new ObjectId(divisi)
                };
                query.push(filterDivisi);
            }
            if (unit) {
                var filterUnit = {
                    "unit._id": new ObjectId(unit)
                };
                query.push(filterUnit);
            }
            if (category) {
                var filterCategory = {
                    "category._id": new ObjectId(category)
                };
                query.push(filterCategory);
            }
            if (currency) {
                var filterCurrency = {
                    "currency._id": new ObjectId(currency)
                };
                query.push(filterCurrency);
            }
            if (startdate && enddate) {
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
                var filterDate = {
                    "date": {
                        $gte: validStartDate,
                        $lte: validEndDate
                    }
                };
                query.push(filterDate);
            }
            else if (!startdate && enddate) {
                validEndDate.setHours(validEndDate.getHours() - offset);
                var filterDateTo = {
                    "date": {
                        $gte: now,
                        $lte: validEndDate
                    }
                };
                query.push(filterDateTo);
            }
            else if (startdate && !enddate) {
                validStartDate.setHours(validStartDate.getHours() - offset);
                var filterDateFrom = {
                    "date": {
                        $gte: validStartDate,
                        $lte: now
                    }
                };
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
    }*/

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

    cleanUp(input) {
        var newArr = [];
        for (var i = 0; i < input.length; i++) {
            if (input[i]) {
                newArr.push(input[i]);
            }
        }
        return newArr;
    }
    /*selectDateById(id) {
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
    }*/

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
            .then((result) => { return this.getSingleByIdOrDefault(purchaseOrder._id, this.purchaseOrderFields) });
    }

    /*getDataDuration(query) {
        return new Promise((resolve, reject) => {
            var deletedQuery = {
                _deleted: false
            };
            var postedQuery = {
                isPosted: true
            };
            var closedQuery = {
                isClosed: false
            };
            var date = {
                "purchaseRequest._createdDate": {
                    "$gte": (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                    "$lte": (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                }
            };

            var offset = query.offset;
            var unitQuery = {};
            if (query.unitId && query.unitId != "") {
                unitQuery = {
                    "purchaseRequest.unit._id": new ObjectId(query.unitId)
                }
            }
            var dates = {
                $divide: [{
                    $subtract: [{
                        $subtract: [
                            { "$add": ["$_createdDate", 60 * 60 * 1000 * offset] },
                            {
                                "$add": [
                                    { "$millisecond": "$_createdDate" },
                                    {
                                        "$multiply": [
                                            { "$second": "$_createdDate" },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": "$_createdDate" },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": ["$_createdDate", 60 * 60 * 1000 * offset] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }
                        ]
                    }, {
                            $subtract: [
                                { "$add": ["$purchaseRequest._createdDate", 60 * 60 * 1000 * offset] },
                                {
                                    "$add": [
                                        { "$millisecond": "$purchaseRequest._createdDate" },
                                        {
                                            "$multiply": [
                                                { "$second": "$purchaseRequest._createdDate" },
                                                1000
                                            ]
                                        },
                                        {
                                            "$multiply": [
                                                { "$minute": "$purchaseRequest._createdDate" },
                                                60, 1000
                                            ]
                                        },
                                        {
                                            "$multiply": [
                                                { "$hour": { "$add": ["$purchaseRequest._createdDate", 60 * 60 * 1000 * offset] } },
                                                60, 60, 1000
                                            ]
                                        }
                                    ]
                                }]
                        }]
                }, 86400000]
            };
            var durationQuery = {};
            if (query.duration === "8-14 hari") {
                durationQuery = {
                    $cond: {
                        if: {
                            "$and": [
                                { $gt: [dates, 7] },
                                { $lte: [dates, 14] }
                            ]
                        },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "15-30 hari") {
                durationQuery = {
                    $cond: {
                        if: {
                            "$and": [
                                { $gt: [dates, 14] },
                                { $lte: [dates, 30] }
                            ]
                        },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "> 30 hari") {
                durationQuery = {
                    $cond: {
                        if: { $gt: [dates, 30] },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }


            var Query = { "$and": [date, deletedQuery, unitQuery] };
            this.collection.aggregate([
                { $unwind: "$items" },
                { $match: Query },
                { $redact: durationQuery },
                {
                    $project: {
                        "purchaseRequest._createdDate": 1,
                        "prDate": "$purchaseRequest.date",
                        "prCreatedDate": "$purchaseRequest._createdDate",
                        "prNo": "$purchaseRequest.no",
                        "division": "$purchaseRequest.unit.division.name",
                        "unit": "$purchaseRequest.unit.name",
                        "budget": "$purchaseRequest.budget.name",
                        "category": "$category.name",
                        "productCode": "$items.product.code",
                        "productName": "$items.product.name",
                        "productQuantity": "$items.defaultQuantity",
                        "productUom": "$items.defaultUom.unit",
                        "poDate": "$_createdDate",
                        "dateDiff": dates,
                        "staff": "$_createdBy"
                    }
                },
                { $sort: { "purchaseRequest._createdDate": -1 } }
            ])
                .toArray().then(report => {
                    var index = 0;
                    for (var x of report) {
                        index++;
                        x.index = index;
                    }
                    report.data = report.slice(parseInt(query.size) * (parseInt(query.page) - 1), parseInt(query.size) + (parseInt(query.size) * (parseInt(query.page) - 1)));
                    report.info = {
                        total: report.length,
                        size: query.size,
                        count: query.size,
                        page: query.page
                    }
                    resolve(report);
                });
        });
    }*/

    /*getXls(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";
        var offset = query.offset;

        for (var report of result.info) {
            index++;
            var dateDiff = Math.ceil(report.dateDiff);
            var item = {};
            item["No"] = index;
            item["Tanggal Purchase Request"] = moment(new Date(report.prDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Buat Purchase Request"] = moment(new Date(report.prCreatedDate)).add(7, 'h').format(dateFormat);
            item["No Purchase Request"] = report.prNo;
            item["Divisi"] = report.division;
            item["Unit"] = report.unit;
            item["Budget"] = report.budget;
            item["Kategori"] = report.category;
            item["Kode Barang"] = report.productCode;
            item["Nama Barang"] = report.productName;
            item["Jumlah Barang"] = report.productQuantity;
            item["Satuan Barang"] = report.productUom;
            item["Tanggal Terima PO Internal"] = moment(new Date(report.poDate)).add(7, 'h').format(dateFormat);
            item["Selisih Tanggal PR - PO Internal (hari)"] = dateDiff;
            item["Nama Staff Pembelian"] = report.staff;


            xls.data.push(item);
        }

        xls.options = {
            "No": "number",
            "Tanggal Purchase Request": "string",
            "No Purchase Request": "string",
            "Divisi": "string",
            "Unit": "string",
            "Budget": "string",
            "Kategori": "string",
            "Kode Barang": "string",
            "Nama Barang": "string",
            "Jumlah Barang": "number",
            "Satuan Barang": "string",
            "Tanggal Terima PO Internal": "string",
            "Selisih Tanggal PR - PO Internal (hari)": "number",
            "Nama Staff Pembelian": "string",

        };

        if (query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PR - PO INTERNAL ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PR - PO INTERNAL ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `LAPORAN DURASI PR - PO INTERNAL ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `LAPORAN DURASI PR - PO INTERNAL.xlsx`;

        return Promise.resolve(xls);
    }*/

    /*getDurationPOEksDoData(query) {
        return new Promise((resolve, reject) => {
            var deletedQuery = {
                "purchaseOrderExternal._deleted": false
            };
            var postedQuery = {
                "purchaseOrderExternal.isPosted": true
            };
            var closedQuery = {
                "purchaseOrderExternal.isClosed": false
            };
            var date = {
                "purchaseOrderExternal._createdDate": {
                    "$gte": (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                    "$lte": (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                }
            };

            var offset = query.offset;
            var unitQuery = {};
            if (query.unitId && query.unitId != "") {
                unitQuery = {
                    "purchaseRequest.unit._id": new ObjectId(query.unitId)
                }
            }
            var dates = {
                $divide: [{
                    $subtract: [{
                        $subtract: [
                            { "$add": ["$items.fulfillments.supplierDoDate", 60 * 60 * 1000 * offset] },
                            {
                                "$add": [
                                    { "$millisecond": "$items.fulfillments.supplierDoDate" },
                                    {
                                        "$multiply": [
                                            { "$second": "$items.fulfillments.supplierDoDate" },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": "$items.fulfillments.supplierDoDate" },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": ["$items.fulfillments.supplierDoDate", 60 * 60 * 1000 * offset] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }
                        ]
                    }, {
                            $subtract: [
                                { "$add": ["$purchaseOrderExternal._createdDate", 60 * 60 * 1000 * offset] },
                                {
                                    "$add": [
                                        { "$millisecond": "$purchaseOrderExternal._createdDate" },
                                        {
                                            "$multiply": [
                                                { "$second": "$purchaseOrderExternal._createdDate" },
                                                1000
                                            ]
                                        },
                                        {
                                            "$multiply": [
                                                { "$minute": "$purchaseOrderExternal._createdDate" },
                                                60, 1000
                                            ]
                                        },
                                        {
                                            "$multiply": [
                                                { "$hour": { "$add": ["$purchaseOrderExternal._createdDate", 60 * 60 * 1000 * offset] } },
                                                60, 60, 1000
                                            ]
                                        }
                                    ]
                                }]
                        }]
                }, 86400000]
            };
            var durationQuery = {};
            if (query.duration === "31-60 hari") {
                durationQuery = {
                    $cond: {
                        if: {
                            "$and": [
                                { $gt: [dates, 30] },
                                { $lte: [dates, 60] }
                            ]
                        },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "61-90 hari") {
                durationQuery = {
                    $cond: {
                        if: {
                            "$and": [
                                { $gt: [dates, 60] },
                                { $lte: [dates, 90] }
                            ]
                        },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "> 90 hari") {
                durationQuery = {
                    $cond: {
                        if: { $gt: [dates, 90] },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            var Query = { "$and": [date, deletedQuery, unitQuery] };
            this.collection.aggregate([
                { $unwind: "$items" },
                { $unwind: "$items.fulfillments" },
                { $match: Query },
                { $redact: durationQuery },
                {
                    $project: {
                        "purchaseOrderExternal._createdDate": 1,
                        "prDate": "$items.purchaseRequest.date",
                        "prCreatedDate": "$items.purchaseRequest._createdDate",
                        "prNo": "$purchaseRequest.no",
                        "division": "$purchaseRequest.unit.division.name",
                        "unit": "$purchaseRequest.unit.name",
                        "budget": "$purchaseRequest.budget.name",
                        "category": "$category.name",
                        "productCode": "$items.product.code",
                        "productName": "$items.product.name",
                        "productQuantity": "$items.fulfillments.deliveryOrderDeliveredQuantity",
                        "productUom": "$items.defaultUom.unit",
                        "productPrice": "$items.pricePerDealUnit",
                        "supplierCode": "$purchaseOrderExternal.supplier.code",
                        "supplierName": "$purchaseOrderExternal.supplier.name",
                        "poDate": "$_createdDate",
                        "poEksDate": "$purchaseOrderExternal.date",
                        "poEksCreatedDate": "$purchaseOrderExternal._createdDate",
                        "expectedDate": "$purchaseOrderExternal.expectedDeliveryDate",
                        "poEksNo": "$purchaseOrderExternal.no",
                        "doDate": "$items.fulfillments.supplierDoDate",
                        "arrivedDate": "$items.fulfillments.deliveryOrderDate",
                        "doNo": "$items.fulfillments.deliveryOrderNo",
                        "dateDiff": dates,
                        "staff": "$_createdBy"
                    }
                },
                { $sort: { "purchaseOrderExternal._createdDate": -1 } }
            ])
                .toArray().then(report => {
                    var index = 0;
                    for (var x of report) {
                        index++;
                        x.index = index;
                    }
                    report.data = report.slice(parseInt(query.size) * (parseInt(query.page) - 1), parseInt(query.size) + (parseInt(query.size) * (parseInt(query.page) - 1)));
                    report.info = {
                        total: report.length,
                        size: query.size,
                        count: query.size,
                        page: query.page
                    }
                    resolve(report);
                });
        });
    }*/

    /*getPrice(dateFrom, dateTo, productName) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var query = Object.assign({});


                    if (productName !== "undefined" && productName !== "") {
                        Object.assign(query, {
                            "items.product.name": productName
                        }
                        );
                    }

                    if (dateFrom !== "undefined" && dateFrom !== "" && dateFrom !== "null" && dateTo !== "undefined" && dateTo !== "" && dateTo !== "null") {
                        Object.assign(query, {
                            date: {
                                $gte: new Date(dateFrom),
                                $lte: new Date(dateTo)
                            }
                        });
                    }

                    query = Object.assign(query, { _deleted: false });
                    this.collection.aggregate([{ "$unwind": "$items" }, { "$match": query }, { $sort: { date: 1 } }]).toArray()
                        .then(purchaseOrders => {
                            resolve(purchaseOrders);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }*/

    /*getXlsDurationPOEksDoData(result, query) {

        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";
        var offset = query.offset;

        for (var report of result.info) {
            index++;
            var dateDiff = Math.ceil(report.dateDiff);
            var item = {};
            item["No"] = index;
            item["Tanggal Purchase Request"] = moment(new Date(report.prDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Buat Purchase Request"] = moment(new Date(report.prCreatedDate)).add(7, 'h').format(dateFormat);
            item["No Purchase Request"] = report.prNo;
            item["Divisi"] = report.division;
            item["Unit"] = report.unit;
            item["Budget"] = report.budget;
            item["Kategori"] = report.category;
            item["Kode Barang"] = report.productCode;
            item["Nama Barang"] = report.productName;
            item["Jumlah Barang"] = report.productQuantity;
            item["Satuan Barang"] = report.productUom;
            item["Harga Barang"] = report.productPrice;
            item["Kode Supplier"] = report.supplierCode;
            item["Nama Supplier"] = report.supplierName;
            item["Tanggal Terima PO Internal"] = moment(new Date(report.poDate)).add(7, 'h').format(dateFormat);
            item["Tanggal PO Eksternal"] = moment(new Date(report.poEksDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Buat PO Eksternal"] = moment(new Date(report.poEksCreatedDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Target Datang"] = moment(new Date(report.expectedDate)).add(7, 'h').format(dateFormat);
            item["No PO Eksternal"] = report.poEksNo;
            item["Tanggal Surat Jalan"] = moment(new Date(report.doDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Datang Barang"] = moment(new Date(report.arrivedDate)).add(7, 'h').format(dateFormat);
            item["No Surat Jalan"] = report.doNo;
            item["Selisih Tanggal PO Eksternal - Surat Jalan (hari)"] = dateDiff;
            item["Nama Staff Pembelian"] = report.staff;


            xls.data.push(item);
        }

        xls.options = {
            "No": "number",
            "Tanggal Purchase Request": "string",
            "No Purchase Request": "string",
            "Divisi": "string",
            "Unit": "string",
            "Budget": "string",
            "Kategori": "string",
            "Kode Barang": "string",
            "Nama Barang": "string",
            "Jumlah Barang": "number",
            "Satuan Barang": "string",
            "Harga Barang": "number",
            "Kode Supplier": "string",
            "Nama Supplier": "string",
            "Tanggal Terima PO Internal": "string",
            "Tanggal PO Eksternal": "string",
            "Tanggal Target Datang": "string",
            "No PO Eksternal": "string",
            "Tanggal Surat Jalan": "string",
            "Tanggal Datang Barang": "string",
            "No Surat Jalan": "string",
            "Selisih Tanggal PO Eksternal - Surat Jalan (hari)": "number",
            "Nama Staff Pembelian": "string"

        };

        if (query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PO EKSTERNAL - SURAT JALAN ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PO EKSTERNAL - SURAT JALAN ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `LAPORAN DURASI PO EKSTERNAL - SURAT JALAN ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `LAPORAN DURASI PO EKSTERNAL - SURAT JALAN.xlsx`;

        return Promise.resolve(xls);
    }*/
};