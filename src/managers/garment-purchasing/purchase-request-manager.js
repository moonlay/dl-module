"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var PurchaseRequest = DLModels.garmentPurchasing.GarmentPurchaseRequest;
var BaseManager = require("module-toolkit").BaseManager;
var UnitManager = require("../master/unit-manager");
var CategoryManager = require("../master/category-manager");
var ProductManager = require("../master/garment-product-manager");
var i18n = require("dl-i18n");
var prStatusEnum = DLModels.purchasing.enum.PurchaseRequestStatus;

module.exports = class PurchaseRequestManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.moduleId = "PR";
        this.year = (new Date()).getFullYear().toString().substring(2, 4);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentPurchaseRequest);
        this.unitManager = new UnitManager(db, user);
        this.categoryManager = new CategoryManager(db, user);
        this.productManager = new ProductManager(db, user);
    }

    _validate(purchaseRequest) {
        var errors = {};
        var valid = purchaseRequest;

        var getPurchaseRequestPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            no: valid.no
        });

        var getUnit = ObjectId.isValid(valid.unitId) ? this.unitManager.getSingleByIdOrDefault(new ObjectId(valid.unitId)) : Promise.resolve(null);
        // var getCategory = ObjectId.isValid(valid.categoryId) ? this.categoryManager.getSingleByIdOrDefault(new ObjectId(valid.categoryId)) : Promise.resolve(null);

        valid.items = valid.items instanceof Array ? valid.items : [];
        var getProducts = valid.items.map((item) => {
            return ObjectId.isValid(item.productId) ? this.productManager.getSingleByIdOrDefault(new ObjectId(item.productId)) : Promise.resolve(null);
        });

        var getCategories = valid.items.map((item) => {
            return ObjectId.isValid(item.productId) ? this.categoryManager.getSingleByIdOrDefault(new ObjectId(item.categoryId)) : Promise.resolve(null);
        });

        return Promise.all(getCategories)
            .then(_categories => {
                return Promise.all([getPurchaseRequestPromise, getUnit].concat(getProducts))
                    .then(results => {
                        var _purchaseRequest = results[0];
                        var _unit = results[1];
                        var _products = results.slice(2, results.length);

                        if (_purchaseRequest)
                            errors["no"] = i18n.__("PurchaseRequest.no.isExists:%s is exists", i18n.__("PurchaseRequest.product._:No"));

                        if (!valid.date || valid.date == "" || valid.date == "undefined")
                            errors["date"] = i18n.__("PurchaseRequest.date.isRequired:%s is required", i18n.__("PurchaseRequest.date._:Date")); //"Tanggal PR tidak boleh kosong";
                        else if (valid.date > valid.expectedDeliveryDate)
                            errors["date"] = i18n.__("PurchaseRequest.date.isGreater:%s is greater than expected delivery date", i18n.__("PurchaseRequest.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";

                        if (!_unit)
                            errors["unit"] = i18n.__("PurchaseRequest.unit.isRequired:%s is not exists", i18n.__("PurchaseRequest.unit._:Unit")); //"Unit tidak boleh kosong";
                        else if (!valid.unitId)
                            errors["unit"] = i18n.__("PurchaseRequest.unit.isRequired:%s is required", i18n.__("PurchaseRequest.unit._:Unit")); //"Unit tidak boleh kosong";

                        // if (!_category)
                        //     errors["category"] = i18n.__("PurchaseRequest.category.isRequired:%s is not exists", i18n.__("PurchaseRequest.category._:Category")); //"Category tidak boleh kosong";
                        // else if (!valid.categoryId)
                        //     errors["category"] = i18n.__("PurchaseRequest.category.isRequired:%s is required", i18n.__("PurchaseRequest.category._:Category")); //"Category tidak boleh kosong";

                        if (!valid.expectedDeliveryDate || valid.expectedDeliveryDate === "" || valid.expectedDeliveryDate === "undefined")
                            valid.expectedDeliveryDate = "";

                        if (valid.items && valid.items.length <= 0) {
                            errors["items"] = i18n.__("PurchaseRequest.items.isRequired:%s is required", i18n.__("PurchaseRequest.items._:Item")); //"Harus ada minimal 1 barang";
                        }
                        else {
                            var itemErrors = [];
                            var valueArr = valid.items.map(function (item) { return item.productId.toString() });

                            var itemDuplicateErrors = new Array(valueArr.length);
                            valueArr.some(function (item, idx) {
                                var itemError = {};
                                if (valueArr.indexOf(item) != idx) {
                                    itemError["product"] = i18n.__("PurchaseRequest.items.product.name.isDuplicate:%s is duplicate", i18n.__("PurchaseRequest.items.product.name._:Product")); //"Nama barang tidak boleh kosong";
                                }
                                if (Object.getOwnPropertyNames(itemError).length > 0) {
                                    itemDuplicateErrors[valueArr.indexOf(item)] = itemError;
                                    itemDuplicateErrors[idx] = itemError;
                                } else {
                                    itemDuplicateErrors[idx] = itemError;
                                }
                            });
                            for (var item of valid.items) {
                                var itemError = {};
                                var _index = valid.items.indexOf(item);
                                if (!item.product || !item.product._id) {
                                    itemError["product"] = i18n.__("PurchaseRequest.items.product.name.isRequired:%s is required", i18n.__("PurchaseRequest.items.product.name._:Product")); //"Nama barang tidak boleh kosong";
                                } else if (Object.getOwnPropertyNames(itemDuplicateErrors[_index]).length > 0) {
                                    Object.assign(itemError, itemDuplicateErrors[_index]);
                                }
                                if (item.quantity <= 0) {
                                    itemError["quantity"] = i18n.__("PurchaseRequest.items.quantity.isRequired:%s is required", i18n.__("PurchaseRequest.items.quantity._:Quantity")); //Jumlah barang tidak boleh kosong";
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

                        if (Object.getOwnPropertyNames(errors).length > 0) {
                            var ValidationError = require("module-toolkit").ValidationError;
                            return Promise.reject(new ValidationError("data does not pass validation", errors));
                        }

                        valid.unitId = _unit._id;
                        valid.unit = _unit;

                        // valid.categoryId = _category._id;
                        // valid.category = _category;

                        valid.date = new Date(valid.date);
                        valid.expectedDeliveryDate = new Date(valid.expectedDeliveryDate);

                        for (var prItem of valid.items) {
                            for (var _product of _products) {
                                if (prItem.product._id.toString() === _product._id.toString()) {
                                    prItem.productId = _product._id;
                                    prItem.product = _product;
                                    break;
                                }
                            }
                            var _category = _categories.find((category) => category._id.toString() === prItem.categoryId.toString())
                            prItem.categoryId = _category._id;
                            prItem.category = _category;
                            prItem.quantity = Number(prItem.quantity);
                        }

                        if (!valid.stamp)
                            valid = new PurchaseRequest(valid);

                        valid.stamp(this.user.username, "manager");
                        return Promise.resolve(valid);
                    });
            });
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
            var filterNo = {
                "no": {
                    "$regex": regex
                }
            };

            var filterRoNo = {
                "roNo": {
                    "$regex": regex
                }
            };

            var filterRefNo = {
                "refNo": {
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

            var filterUnitDivisionName = {
                "unit.division.name": {
                    "$regex": regex
                }
            };

            var filterUnitName = {
                "unit.name": {
                    "$regex": regex
                }
            };

            var filterCategory = {
                "items.category.name": {
                    "$regex": regex
                }
            };
            keywordFilter['$or'] = [filterNo, filterUnitDivisionName, filterUnitName, filterCategory, filterRoNo, filterRefNo, filterBuyer, filterArtikel];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    getAllDataPR(filter) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var query = Object.assign({});
                    query = Object.assign(query, filter);
                    query = Object.assign(query, {
                        _deleted: false
                    });

                    var _select = [
                        "no",
                        "refNo",
                        "buyer",
                        "artikel",
                        "date",
                        "expectedDeliveryDate",
                        "shipmentDate",
                        "unit",
                        "remark",
                        "isPosted",
                        "isUsed",
                        "_createdBy",
                        "items.product",
                        "items.quantity",
                        "items.budgetPrice",
                        "items.uom",
                        "items.category",
                        "items.remark"
                    ];
                    this.collection.where(query).select(_select).execute()
                        .then((purchaseRequests) => {
                            resolve(purchaseRequests.data);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }

    getPurchaseRequestByTag(keyword, shipmentDate) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var keywords = [];

                    var query = Object.assign({});
                    query = Object.assign(query, {
                        _deleted: false,
                        isPosted: true,
                        isUsed: false
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
                        "refNo": 1,
                        "roNo": 1,
                        "buyer": "$buyer.name",
                        "artikel": 1,
                        "shipmentDate": 1,
                        "unit": "$unit.name",
                        "division": "$unit.division.name",
                        "isPosted": 1,
                        "isUsed": 1,
                        "_createdBy": 1,
                        "year": { $year: "$shipmentDate" },
                        "month": { $month: "$shipmentDate" },
                        "day": { $dayOfMonth: "$shipmentDate" },
                    };

                    var qryMatch = [{ $match: query }, { $project: _select }];

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
                        .then((purchaseRequests) => {
                            resolve(purchaseRequests);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }

    getDataPRMonitoring(unitId, categoryId, PRNo, dateFrom, dateTo, state, offset, createdBy) {//all user or by user (createdBy)
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var query = Object.assign({});

                    if (state !== -1 && state !== "undefined" && state !== undefined) {
                        Object.assign(query, {
                            "status.value": state
                        });
                    }

                    if (unitId !== "undefined" && unitId !== "" && unitId !== undefined) {
                        Object.assign(query, {
                            unitId: new ObjectId(unitId)
                        });
                    }
                    if (categoryId !== "undefined" && categoryId !== "" && categoryId !== undefined) {
                        Object.assign(query, {
                            "items.categoryId": new ObjectId(categoryId)
                        });
                    }

                    if (PRNo !== "undefined" && PRNo !== "" && PRNo !== undefined) {
                        Object.assign(query, {
                            "no": PRNo
                        });
                    }
                    if (dateFrom !== "undefined" && dateFrom !== "" && dateFrom !== "null" && dateFrom !== undefined && dateTo !== "undefined" && dateTo !== "" && dateTo !== "null" && dateTo !== undefined) {
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
                    query = Object.assign(query, {
                        _deleted: false,
                        isPosted: true
                    });

                    this.collection.find(query).toArray()
                        .then((purchaseRequests) => {
                            resolve(purchaseRequests);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentPurchaseRequest}_date`,
            key: {
                date: -1
            }
        };

        var noIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentPurchaseRequest}_no`,
            key: {
                no: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    updateCollectionPR(purchaseRequest) {
        if (!purchaseRequest.stamp) {
            purchaseRequest = new PurchaseRequest(purchaseRequest);
        }
        purchaseRequest.stamp(this.user.username, 'manager');
        return this.collection
            .updateOne({
                _id: purchaseRequest._id
            }, {
                $set: purchaseRequest
            })
            .then((result) => { return this.getSingleByIdOrDefault(purchaseRequest._id) });
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
};