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
                            poItem.productId = new ObjectId(_prItem.product._id);
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

    // getPurchaseOrderByTag(user, categoryId, keyword, shipmentDateFrom, shipmentDateTo) {        
    getPurchaseOrderByTag(user, category, keyword, shipmentDateFrom, shipmentDateTo) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var keywords = [];

                    var query = Object.assign({});
                    var queryCategory = Object.assign({});
                    var queryMatchItems = Object.assign({});

                    if (category === "FABRIC") {
                        queryCategory = {
                            "items.category.code": "FAB",
                            "items.isPosted": false,
                            "items.isClosed": false
                        };
                    } else {
                        queryCategory = {
                            "items.category.code": { "$ne": "FAB" },
                            "items.isPosted": false,
                            "items.isClosed": false
                        };
                    }
                    query = Object.assign(query, {
                        _deleted: false,
                        isClosed: false,
                        isPosted: false,
                        "_createdBy": user
                    });
                    if (keyword) {
                        keyword = keyword.replace(/ \#/g, '#');
                        var keywordFilters = [];
                        if (keyword.indexOf("#") != -1) {
                            keywords = keyword.split("#");
                            keywords.splice(0, 1)
                        } else {
                            keywords.push(keyword)
                        }
                        for (var j = 0; j < keywords.length; j++) {
                            var keywordFilter = {};
                            var _keyword = keywords[j]
                            if (_keyword) {
                                _keyword = _keyword.replace("(", "\\(");
                                _keyword = _keyword.replace(")", "\\)");
                                var regex = new RegExp(_keyword,"i");
                                switch (j) {
                                    case 0:
                                        keywordFilters.push({
                                            "unit.name": {
                                                "$regex": regex
                                            }
                                        });
                                        break;
                                    case 1:
                                        keywordFilters.push({
                                            "buyer.name": {
                                                "$regex": regex
                                            }
                                        });
                                        break;
                                    case 2:
                                        queryMatchItems = Object.assign(queryMatchItems, {
                                            "items.category.name": {
                                                "$regex": regex
                                            }
                                        });
                                        break;                                           
                                }
                            }
                        }
                        if (keywordFilters.length > 0) {
                            query['$and'] = keywordFilters;
                        }
                    }

                    var _select = {
                        "no": 1,
                        "purchaseRequest.no": 1,
                        "purchaseRequest._id": 1,
                        "roNo": 1,
                        "artikel":1,
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
                        "items.remark": "$items.remark"
                    };

                    var _sort = { "items.refNo" : 1 };
                    var qryMatch = [{ $match: query }, { $unwind: "$items" }, { $match: queryCategory }, { $match: queryMatchItems }, { $project: _select}, { $sort: _sort}];

                    var queryDate = Object.assign({});
                    if (shipmentDateFrom && shipmentDateTo) {
                        var _shipmentDateFrom = new Date(shipmentDateFrom);
                        var _shipmentDateTo = new Date(shipmentDateTo);

                        queryDate = {
                            year: { $gte: _shipmentDateFrom.getFullYear(), $lte: _shipmentDateTo.getFullYear() },
                            month: { $gte: _shipmentDateFrom.getMonth() + 1, $lte: _shipmentDateTo.getMonth() + 1 },
                            day: { $gte: _shipmentDateFrom.getDate(), $lte: _shipmentDateTo.getDate() },
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
                    var prItems = purchaseRequest.items.find((item) => item.product._id.toString() === _purchaseRequest.items.productId.toString() && item.id_po.toString() === _purchaseRequest.items.id_po.toString())

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
            })
            .catch(e => {
                return Promise.reject(e);
            });
    }

    delete(purchaseOrder) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this._validate(purchaseOrder)
                    .then(validData => {
                        return this.collection.updateOne({ _id: validData._id }, { $set: { "_deleted": true, "_updatedDate": new Date() } })
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
                                            sourceItem.defaultQuantity = parseFloat((sourceItem.defaultQuantity - item.defaultQuantity).toFixed(2));
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
        var createdDateIndex = {
            name: `ix_${map.purchasing.collection.PurchaseOrder}__createdDate`,
            key: {
                _createdDate: -1
            }
        };

        return this.collection.createIndexes([dateIndex, noIndex, createdDateIndex]);
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
            .then((result) => { return this.getSingleByIdOrDefault(purchaseOrder._id, this.purchaseOrderFields) });
    }

    getXls(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";
        var timeFormat = "HH : mm";

        for (var data of result.data) {
            index++;
            var item = {};
            item["No"] = index;
            item["Nomor Purchase Order"] = data ? data.refNo : '';
            item["Tanggal PO"] = data.date ? moment(new Date(data.date)).format(dateFormat) : '';
            item["Tanggal Shipment"] = data.shipmentDate ? moment(new Date(data.shipmentDate)).format(dateFormat) : '';
            item["Nomor RO"] = data.roNo ? data.roNo : '';
            item["Buyer"] = data.buyer.name ? data.buyer.name : '';
            item["Artikel"] = data.artikel ? data.artikel : '';
            item["Unit"] = data.unit.name ? data.unit.name : '';
            item["Nomor Referensi PR"] = data.items[0].refNo ? data.items[0].refNo : '';
            item["Kategori"] = data.items[0].category.name ? data.items[0].category.name : '';
            item["Kode Barang"] = data.items[0].product.code ? data.items[0].product.code : '';
            item["Nama Barang"] = data.items[0].product.name ? data.items[0].product.name : '';
            item["Keterangan"] = data.items[0].remark ? data.items[0].remark : '';
            item["Jumlah"] = data.items[0].defaultQuantity ? data.items[0].defaultQuantity : '';
            item["Satuan"] = data.items[0].defaultUom.unit ? data.items[0].defaultUom.unit : '';
            item["Harga Budget"] = data.items[0].budgetPrice ? data.items[0].budgetPrice : '';
            item["Staff"] = data._createdBy ? data._createdBy : '';

            xls.data.push(item);
        }

        xls.options["No"] = "number";
        xls.options["Nomor Purchase Order"] = "string";
        xls.options["Tanggal PO"] = "string";
        xls.options["Tanggal Shipment"] = "string";
        xls.options["Nomor RO"] = "string";
        xls.options["Buyer"] = "string";
        xls.options["Artikel"] = "string";
        xls.options["Unit"] = "string";
        xls.options["Nomor Referensi PR"] = "string";
        xls.options["Kategori"] = "string";
        xls.options["Kode Barang"] = "string";
        xls.options["Nama Barang"] = "string";
        xls.options["Keterangan"] = "string";
        xls.options["Jumlah"] = "number";
        xls.options["Satuan"] = "string";
        xls.options["Harga Budget"] = "number";
        xls.options["Staff"] = "string";

        if (query.dateFrom && query.dateTo) {
            xls.name = `Purchase Order Internal  Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Purchase Order Internal Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Purchase Order Internal Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Purchase Order Internal Report.xlsx`;

        return Promise.resolve(xls);
    }

    getReport(info) {

        var _defaultFilter = {
            $and: [{ _deleted: false },
            { _createdBy: info.filter._createdBy }]
        }

        var noFilter = {};
        var categoryFilter = {};
        var unitFilter = {};
        var buyerFilter = {};
        var dateFromFilter = {};
        var dateToFilter = {};
        var query = {};

        var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
        var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59")) : (new Date());
        var now = new Date();

        if (info.no && info.no != '') {
            var nomorPr = ObjectId.isValid(info.no) ? new ObjectId(info.no) : {};
            noFilter = { '_id': nomorPr };
        }

        if (info.unit && info.unit != '') {
            var unit = ObjectId.isValid(info.unit) ? new ObjectId(info.unit) : {};
            unitFilter = { 'unit._id': unit };
        }

        if (info.category && info.category != '') {
            var category = ObjectId.isValid(info.category) ? new ObjectId(info.category) : {};
            categoryFilter = { 'items.category._id': category };
        }

        if (info.buyer && info.buyer != '') {
            var buyer = ObjectId.isValid(info.buyer) ? new ObjectId(info.buyer) : {};
            buyerFilter = { 'buyer._id': buyer };
        }

        var filterDate = {
            "date": {
                $gte: new Date(dateFrom),
                $lte: new Date(dateTo)
            }
        };

        query = { '$and': [_defaultFilter, buyerFilter, categoryFilter, unitFilter, noFilter, filterDate] };

        return this._createIndexes()
            .then((createIndexResults) => {
                return !info.xls ?
                    this.collection
                        .where(query)
                        .execute() :
                    this.collection
                        .where(query)
                        .page(info.page, info.size)
                        .execute();
            });
    }

    getPurchaseReport(info) {
        var query = {
            _deleted: false,
            isClosed: true,
            "items.isClosed": true,
        };

        if (info.state && info.state !== -1) {
            Object.assign(query, {
                "status.value": info.state
            });
        }
        if (info.user && info.user !== "") {
            Object.assign(query, {
                _createdBy: info.user
            });
        }
        if (info.unitId && info.unitId !== "") {
            Object.assign(query, {
                unitId: new ObjectId(info.unitId)
            });
        }
        if (info.categoryId && info.categoryId !== "") {
            Object.assign(query, {
                "items.categoryId": new ObjectId(info.categoryId)
            });
        }
        if (info.purchaseOrderExternalNo && info.purchaseOrderExternalNo !== "") {
            var regexPO = new RegExp(info.purchaseOrderExternalNo, "i");
            Object.assign(query, {
                "items.purchaseOrderExternal.no": {
                    '$regex': regexPO
                }
            });
        }
        if (info.supplierId && info.supplierId !== "") {
            Object.assign(query, {
                "items.supplierId": new ObjectId(info.supplierId)
            });
        }
        if (info.artikel && info.artikel !== "") {
            var regex = new RegExp(info.artikel, "i");
            Object.assign(query, {
                artikel: {
                    '$regex': regex
                }
            });
        }
        if (info.prRefNo && info.prRefNo !== "") {
            Object.assign(query, {
                "items.refNo": info.prRefNo
            });
        }
        if (info.roNo && info.roNo !== "") {
            Object.assign(query, {
                roNo: info.roNo
            });
        }
        if (info.deliveryOrderNo && info.deliveryOrderNo !== "") {
            var regexDO = new RegExp(info.deliveryOrderNo, "i");
            Object.assign(query, {
                "items.fulfillments.deliveryOrderNo": {
                    '$regex': regexDO
                }
            })
        }

        var offset = Number(info.offset) || 7;
        var page = (Number(info.page) || 1) - 1;
        var size = Number(info.size) || 25;
        var _dateNow = new Date();
        var dateFormat = "DD/MM/YYYY";

        if (info.dateFrom && info.dateFrom !== "" && info.dateTo && info.dateTo !== "") {
            var _dateFrom = new Date(info.dateFrom);
            var _dateTo = new Date(info.dateTo);
            _dateFrom.setHours(_dateFrom.getHours() - offset);
            _dateTo.setHours(_dateTo.getHours() - offset);
            Object.assign(query, {
                "purchaseRequest.date": {
                    $gte: _dateFrom,
                    $lte: _dateTo
                }
            });
        } else if (info.dateFrom && info.dateFrom !== "") {
            if (!info.dateTo && info.dateTo === "") {
                var _dateFrom = new Date(info.dateFrom);
                if (_dateNow > _dateFrom) {
                    var _dateTo = new Date();
                    _dateFrom.setHours(_dateFrom.getHours() - offset);
                    _dateTo.setHours(_dateTo.getHours() - offset);
                    Object.assign(query, {
                        "purchaseRequest.date": {
                            $gte: _dateFrom,
                            $lte: _dateTo
                        }
                    });
                }
            }
        } else if (info.dateTo && info.dateTo !== "") {
            if (!info.dateFrom && info.dateFrom === "") {
                var _dateTo = new Date(info.dateTo);
                if (_dateNow < _dateTo) {
                    var _dateFrom = new Date();
                    _dateFrom.setHours(_dateFrom.getHours() - offset);
                    _dateTo.setHours(_dateTo.getHours() - offset);
                    Object.assign(query, {
                        "purchaseRequest.date": {
                            $gte: _dateFrom,
                            $lte: _dateTo
                        }
                    });
                }
            }
        }

        return this._createIndexes()
            .then((createIndexResults) => {
                var getDataPromise = [];
                getDataPromise.push(
                    this.collection
                        .aggregate([
                            {
                                $match: query
                            },
                            {
                                $unwind: { path: "$items", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $unwind: { path: "$items.fulfillments", preserveNullAndEmptyArrays: true }
                            },
                            { $group: { _id: null, count: { $sum: 1 } } }
                        ])
                        .toArray()
                );

                if (info.xls) {
                    getDataPromise.push(
                        this.collection
                            .aggregate([
                                {
                                    $match: query
                                },
                                {
                                    $unwind: { path: "$items", preserveNullAndEmptyArrays: true }
                                },
                                {
                                    $project: {
                                        "prDate": "$purchaseRequest.date",
                                        "prNo": "$purchaseRequest.no",
                                        "prCreatedDate": "$purchaseRequest._createdDate",
                                        "unit.name": 1,
                                        "unit.division.name": 1,
                                        "refNo": "$items.refNo",
                                        "roNo": "$roNo",
                                        "buyer.code": "$buyer.code",
                                        "buyer.name": "$buyer.name",
                                        "purchaseRequest.shipmentDate": "$purchaseRequest.shipmentDate",
                                        "artikel": "$artikel",
                                        "product.name": "$items.product.name",
                                        "product.code": "$items.product.code",
                                        "product.description": "$items.remark",
                                        "category": "$items.category.name",
                                        "defaultQuantity": "$items.defaultQuantity",
                                        "defaultUom": "$items.defaultUom.unit",
                                        "budgetPrice": "$items.budgetPrice",
                                        "currencyRate": "$items.currency.rate",
                                        "dealQuantity": "$items.dealQuantity",
                                        "currency": "$items.currency.code",
                                        "dealUom": "$items.dealUom.unit",
                                        "pricePerDealUnit": "$items.pricePerDealUnit",
                                        "supplier.name": "$items.supplier.name",
                                        "supplier.code": "$items.supplier.code",
                                        "_createdDate": 1,
                                        "poeNo": "$items.purchaseOrderExternal.no",
                                        "poeDate": "$items.purchaseOrderExternal.date",
                                        "poeExpectedDeliveryDate": "$items.purchaseOrderExternal.expectedDeliveryDate",
                                        "usePPN": "$items.purchaseOrderExternal.useIncomeTax",
                                        "usePPH": "$items.purchaseOrderExternal.useVat",
                                        "vatRate": "$items.purchaseOrderExternal.vatRate",
                                        "status": 1,
                                        "fulfillments": "$items.fulfillments",
                                        "fulfillmentsTotal": "$items.fulfillments.deliveryOrderDeliveredQuantity",
                                        "remark": "$items.remark"
                                    }
                                },
                                {
                                    $unwind: { path: "$fulfillments", preserveNullAndEmptyArrays: true, includeArrayIndex: "arrayIndex" }
                                },
                                {
                                    $project: {
                                        "prDate": 1,
                                        "prNo": 1,
                                        "prCreatedDate": 1,
                                        "unit.name": 1,
                                        "unit.division.name": 1,
                                        "refNo": 1,
                                        "roNo": 1,
                                        "buyer.code": 1,
                                        "buyer.name": 1,
                                        "purchaseRequest.shipmentDate": 1,
                                        "artikel": 1,
                                        "product.name": 1,
                                        "product.code": 1,
                                        "product.description": 1,
                                        "category": 1,
                                        "defaultQuantity": 1,
                                        "defaultUom": 1,
                                        "budgetPrice": 1,
                                        "currencyRate": 1,
                                        "dealQuantity": 1,
                                        "currency": 1,
                                        "dealUom": 1,
                                        "pricePerDealUnit": 1,
                                        "supplier.name": 1,
                                        "supplier.code": 1,
                                        "_createdDate": 1,
                                        "poeNo": 1,
                                        "poeDate": 1,
                                        "poeExpectedDeliveryDate": 1,
                                        "usePPN": 1,
                                        "usePPH": 1,
                                        "vatRate": 1,
                                        "status": 1,
                                        "fulfillment": "$fulfillments",
                                        "fulfillmentsTotal": 1,
                                        "arrayIndex": 1,
                                        "remark": 1
                                    }
                                },
                                 { $sort : { "refNo" : 1 } }
                            ])
                            .toArray()
                    );
                } else {
                    getDataPromise.push(this.collection
                        .aggregate([
                            {
                                $match: query
                            },
                            {
                                $unwind: { path: "$items", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $project: {
                                    "prDate": "$purchaseRequest.date",
                                    "prNo": "$purchaseRequest.no",
                                    "prCreatedDate": "$purchaseRequest._createdDate",
                                    "unit.name": 1,
                                    "unit.division.name": 1,
                                    "refNo": "$items.refNo",
                                    "roNo": "$roNo",
                                    "buyer.code": "$buyer.code",
                                    "buyer.name": "$buyer.name",
                                    "purchaseRequest.shipmentDate": "$purchaseRequest.shipmentDate",
                                    "artikel": "$artikel",
                                    "product.name": "$items.product.name",
                                    "product.code": "$items.product.code",
                                    "product.description": "$items.remark",
                                    "category": "$items.category.name",
                                    "defaultQuantity": "$items.defaultQuantity",
                                    "defaultUom": "$items.defaultUom.unit",
                                    "budgetPrice": "$items.budgetPrice",
                                    "currencyRate": "$items.currency.rate",
                                    "dealQuantity": "$items.dealQuantity",
                                    "currency": "$items.currency.code",
                                    "dealUom": "$items.dealUom.unit",
                                    "pricePerDealUnit": "$items.pricePerDealUnit",
                                    "supplier.name": "$items.supplier.name",
                                    "supplier.code": "$items.supplier.code",
                                    "_createdDate": 1,
                                    "poeNo": "$items.purchaseOrderExternal.no",
                                    "poeDate": "$items.purchaseOrderExternal.date",
                                    "poeExpectedDeliveryDate": "$items.purchaseOrderExternal.expectedDeliveryDate",
                                    "usePPN": "$items.purchaseOrderExternal.useIncomeTax",
                                    "usePPH": "$items.purchaseOrderExternal.useVat",
                                    "vatRate": "$items.purchaseOrderExternal.vatRate",
                                    "status": 1,
                                    "fulfillments": "$items.fulfillments",
                                    "fulfillmentsTotal": "$items.fulfillments.deliveryOrderDeliveredQuantity",
                                    "remark": "$items.remark"
                                }
                            },
                            {
                                $unwind: { path: "$fulfillments", preserveNullAndEmptyArrays: true, includeArrayIndex: "arrayIndex" }
                            },
                            {
                                $project: {
                                    "prDate": 1,
                                    "prNo": 1,
                                    "prCreatedDate": 1,
                                    "unit.name": 1,
                                    "unit.division.name": 1,
                                    "refNo": 1,
                                    "roNo": 1,
                                    "buyer.code": 1,
                                    "buyer.name": 1,
                                    "purchaseRequest.shipmentDate": 1,
                                    "artikel": 1,
                                    "product.name": 1,
                                    "product.code": 1,
                                    "product.description": 1,
                                    "category": 1,
                                    "defaultQuantity": 1,
                                    "defaultUom": 1,
                                    "budgetPrice": 1,
                                    "currencyRate": 1,
                                    "dealQuantity": 1,
                                    "currency": 1,
                                    "dealUom": 1,
                                    "pricePerDealUnit": 1,
                                    "supplier.name": 1,
                                    "supplier.code": 1,
                                    "_createdDate": 1,
                                    "poeNo": 1,
                                    "poeDate": 1,
                                    "poeExpectedDeliveryDate": 1,
                                    "usePPN": 1,
                                    "usePPH": 1,
                                    "vatRate": 1,
                                    "status": 1,
                                    "fulfillment": "$fulfillments",
                                    "fulfillmentsTotal": 1,
                                    "arrayIndex": 1,
                                    "remark": 1
                                }
                            },
                            { $sort : { "refNo" : 1 } },
                            { $skip: page * size },
                            { $limit: size }
                        ])
                        .toArray()
                    );
                }

                return Promise.all(getDataPromise);
            })
            .then(result => {
                var resCount = result[0];
                var count = resCount.length > 0 ? resCount[0].count : 0;
                var listData = result[1];
                var dataReport = [];
                var index = 0;

                for (var data of listData) {
                    var incomeValue = 0, vatValue = 0;
                    var remainQuantity = 0;
                    var sum = 0;

                    if (data.arrayIndex || data.arrayIndex >= 0) {
                        sum = 0;
                        for (var i = 0; i <= data.arrayIndex; i++) {
                            sum += data.fulfillmentsTotal[i];
                        }
                    }
                    remainQuantity = data.dealQuantity - sum;

                    if (data.fulfillment) {
                        if (data.fulfillment.invoiceUseIncomeTax) {
                            incomeValue = (data.fulfillment.deliveryOrderDeliveredQuantity || 0) * data.pricePerDealUnit * data.currencyRate * 0.1;
                        }
                        if (data.fulfillment.invoiceUseVat) {
                            vatValue = (data.fulfillment.deliveryOrderDeliveredQuantity || 0) * data.pricePerDealUnit * data.currencyRate * data.fulfillment.invoiceVat.rate / 100;
                        }
                        if (data.fulfillment.corrections) {
                            var i = 1;
                            var _correctionNo = "";
                            var _correctionPriceTotal = "";
                            var _correctionDate = "";
                            var _correctionType = "";
                            for (var correction of data.fulfillment.corrections) {
                                var total = (correction.newPriceTotal - correction.oldPriceTotal) * correction.currencyRate
                                _correctionNo = `${_correctionNo}${i}. ${correction.correctionNo}\n`;
                                _correctionPriceTotal = `${_correctionPriceTotal}${i}. ${total.toLocaleString()}\n`;
                                _correctionDate = `${_correctionDate}${i}. ${moment(new Date(correction.correctionDate)).add(offset, 'h').format(dateFormat)}\n`;
                                _correctionType = `${_correctionType}${i}. ${correction.correctionType}\n`;
                                i++;
                            }
                            data.correction = {
                                correctionNo: _correctionNo,
                                correctionPriceTotal: _correctionPriceTotal,
                                correctionDate: _correctionDate,
                                correctionType: _correctionType
                            }
                        }
                    } else {
                        data.correction = {};
                    }
                    if (!data.supplier) {
                        data.supplier = {
                            code: "",
                            name: ""
                        }
                    }
                    index++;
                    var item = {
                        no: index,
                        prDate: data.prDate ? moment(new Date(data.prDate)).add(offset, 'h').format(dateFormat) : "-",
                        prNo: data.prNo,
                        unit: data.unit.name,
                        division: data.unit.division.name,
                        refNo: data.refNo,
                        roNo: data.roNo,
                        buyerCode: data.buyer.code,
                        buyerName: data.buyer.name,                        
                        shipmentDate: data.purchaseRequest.shipmentDate ? moment(new Date(data.purchaseRequest.shipmentDate)).add(offset, 'h').format(dateFormat): "-",
                        artikel: data.artikel,
                        category: data.category,
                        productName: data.product.name,
                        productCode: data.product.code,
                        productDesc: data.product.description,
                        defaultQuantity: data.defaultQuantity ? data.defaultQuantity : 0,
                        defaultUom: data.defaultUom ? data.defaultUom : "-",
                        dealUom: data.dealUom ? data.dealUom : "-",
                        budgetPrice: data.budgetPrice,
                        pricePerItem: data.pricePerDealUnit,
                        priceTotal: data.pricePerDealUnit * data.dealQuantity,
                        priceTtl: data.pricePerDealUnit * data.dealQuantity * data.currencyRate,
                        currencyRate: data.currencyRate,
                        supplierCode: data.supplier.code,
                        supplierName: data.supplier.name,
                        poIntCreatedDate: data._createdDate ? moment(new Date(data._createdDate)).add(offset, 'h').format(dateFormat) : "-",
                        poExtNo: data.poeNo,
                        poExtDate: data.poeDate ? moment(new Date(data.poeDate)).add(offset, 'h').format(dateFormat) : "-",
                        poExtExpectedDeliveryDate: data.poeExpectedDeliveryDate ? moment(new Date(data.poeExpectedDeliveryDate)).add(offset, 'h').format(dateFormat) : "-",
                        poExtPPN: data.usePPN ? "Ya" : "Tidak",
                        poExtPPH: data.usePPH ? "Ya" : "Tidak",
                        poExtVat: data.vatRate ? data.vatRate : "-",
                        dealQuantity: data.dealQuantity ? data.dealQuantity : 0,
                        currency: data.currency,
                        deliveryOrderNo: data.fulfillment ? data.fulfillment.deliveryOrderNo ? data.fulfillment.deliveryOrderNo : "-" : "-",
                        deliveryOrderUseCustoms: data.fulfillment ? data.fulfillment.deliveryOrderUseCustoms ? data.fulfillment.deliveryOrderUseCustoms : false : false,
                        supplierDoDate: data.fulfillment ? data.fulfillment.supplierDoDate ? moment(new Date(data.fulfillment.supplierDoDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        deliveryOrderDate: data.fulfillment ? data.fulfillment.deliveryOrderDate ? moment(new Date(data.fulfillment.deliveryOrderDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        deliveryOrderDeliveredQuantity: data.fulfillment ? data.fulfillment.deliveryOrderDeliveredQuantity ? data.fulfillment.deliveryOrderDeliveredQuantity : 0 : 0,
                        deliveryOrderDeliveredUom: data.defaultUom ? data.defaultUom : "-",
                        remainQuantity: remainQuantity,
                        customsNo: data.fulfillment ? data.fulfillment.customsNo ? data.fulfillment.customsNo : "-" : "-",
                        customsDate: data.fulfillment ? data.fulfillment.customsDate ? moment(new Date(data.fulfillment.customsDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        unitReceiptNoteNo: data.fulfillment ? data.fulfillment.unitReceiptNoteNo ? data.fulfillment.unitReceiptNoteNo : "-" : "-",
                        unitReceiptNoteDate: data.fulfillment ? data.fulfillment.unitReceiptNoteDate ? moment(new Date(data.fulfillment.unitReceiptNoteDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        unitReceiptNoteDeliveredQuantity: data.fulfillment ? data.fulfillment.unitReceiptNoteDeliveredQuantity ? data.fulfillment.unitReceiptNoteDeliveredQuantity : 0 : 0,
                        unitReceiptDeliveredUom: data.fulfillment ? data.fulfillment.unitReceiptDeliveredUom ? data.fulfillment.unitReceiptDeliveredUom.unit : "-" : "-",
                        invoiceNo: data.fulfillment ? data.fulfillment.invoiceNo ? data.fulfillment.invoiceNo : "-" : "-",
                        invoiceDate: data.fulfillment ? data.fulfillment.invoiceDate ? moment(new Date(data.fulfillment.invoiceDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        invoiceUseIncomeTax: data.fulfillment ? data.fulfillment.invoiceUseIncomeTax ? data.fulfillment.invoiceUseIncomeTax : false : false,
                        invoiceIncomeTaxNo: data.fulfillment ? data.fulfillment.invoiceIncomeTaxNo ? data.fulfillment.invoiceIncomeTaxNo : "-" : "-",
                        invoiceIncomeTaxDate: data.fulfillment ? data.fulfillment.invoiceIncomeTaxDate ? moment(new Date(data.fulfillment.invoiceIncomeTaxDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        incomeValue: incomeValue,
                        invoiceUseVat: data.fulfillment ? data.fulfillment.invoiceUseVat ? data.fulfillment.invoiceUseVat : false : false,
                        invoiceVat: data.fulfillment ? data.fulfillment.invoiceVat ? `${data.fulfillment.invoiceVat.name} ${data.fulfillment.invoiceVat.rate}` : "-" : "-",
                        invoiceVatNo: data.fulfillment ? data.fulfillment.invoiceVatNo ? data.fulfillment.invoiceVatNo : "-" : "-",
                        invoiceVatDate: data.fulfillment ? data.fulfillment.invoiceVatDate ? moment(new Date(data.fulfillment.invoiceVatDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        vatValue: vatValue,
                        interNoteNo: data.fulfillment ? data.fulfillment.interNoteNo ? data.fulfillment.interNoteNo : "-" : "-",
                        interNoteDate: data.fulfillment ? data.fulfillment.interNoteDate ? moment(new Date(data.fulfillment.interNoteDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        interNoteValue: data.fulfillment ? data.fulfillment.interNoteQuantity && data.fulfillment.interNotePrice ? (data.fulfillment.interNoteQuantity * data.fulfillment.interNotePrice) : 0 : 0,
                        interNoteDueDate: data.fulfillment ? data.fulfillment.interNoteDueDate ? moment(new Date(data.fulfillment.interNoteDueDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        correctionNo: data.correction ? data.correction.correctionNo : "-",
                        correctionDate: data.correction ? data.correction.correctionDate : "-",
                        correctionPriceTotal: data.correction ? data.correction.correctionPriceTotal : 0,
                        correctionRemark: data.correction ? data.correction.correctionType : "-",
                        remark: data.remark ? data.remark : "-",
                        status: data.status ? data.status.label : "-",
                        statusValue: data.status ? data.status.value : 0
                    }
                    dataReport.push(item);
                }

                var result = {
                    data: dataReport,
                    count: dataReport.length,
                    size: size,
                    total: count,
                    page: page + 1
                };

                return Promise.resolve(result);
            })
    }

    getXlsPurchaseReport(results, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';
        var offset = query.offset || 7;
        var dateFormat = "DD/MM/YYYY";

        for (var data of results.data) {
            var item = {
                "No": data.no,
                "Tanggal Purchase Request": data.prDate,
                "No Purchase Request": data.prNo,
                "Unit": data.unit,
                "Divisi": data.division,
                "No Ref Purchase Request": data.refNo,
                "No RO": data.roNo,
                "Buyer": data.buyerCode,
                "Nama Buyer": data.buyerName,
                "Shipment Garment": data.shipmentDate,
                "Artikel": data.artikel,
                "Kategori": data.category,
                "Nama Barang": data.productName,
                "Kode Barang": data.productCode,
                "Keterangan Barang": data.productDesc,
                "Jumlah Barang": data.dealQuantity,
                "Satuan Barang": data.dealUom,
                "Harga Budget": data.budgetPrice,
                "Harga Satuan Beli": data.pricePerItem,
                "Harga Total": data.priceTotal,
                "Mata Uang": data.currency,
                "Kurs": data.currencyRate,
                "Harga Total Rp": data.priceTtl,
                "Kode Supplier": data.supplierCode,
                "Nama Supplier": data.supplierName,
                "Tanggal Terima PO Internal": data.poIntCreatedDate,
                "No PO Eksternal": data.poExtNo,
                "Tanggal PO Eksternal": data.poExtDate,
                "Tanggal Target Datang": data.poExtExpectedDeliveryDate,
                "Dikenakan PPN": data.poExtPPN,
                "Dikenakan PPH": data.poExtPPH,
                "PPH": data.poExtVat,
                "No Surat Jalan": data.deliveryOrderNo,
                "Dikenakan Bea Cukai": data.deliveryOrderUseCustoms ? "Ya" : "Tidak",
                "Tanggal Surat Jalan": data.supplierDoDate,
                "Tanggal Datang Barang": data.deliveryOrderDate,
                "Jumlah Barang Datang": data.deliveryOrderDeliveredQuantity,
                "Satuan": data.dealUom,
                "Jumlah Barang Sisa": data.remainQuantity,
                "No Bea Cukai": data.customsNo,
                "Tanggal Bea Cukai": data.customsDate,
                "No Bon Terima Unit": data.unitReceiptNoteNo,
                "Tanggal Bon Terima Unit": data.unitReceiptNoteDate,
                "Jumlah Barang Diterima": data.unitReceiptNoteDeliveredQuantity,
                "Satuan Barang Diterima": data.unitReceiptDeliveredUom,
                "No Invoice": data.invoiceNo,
                "Tanggal Invoice": data.invoiceDate,
                "Dikenakan PPN": data.invoiceUseIncomeTax ? "Ya" : "Tidak",
                "No PPN": data.invoiceIncomeTaxNo,
                "Tanggal PPN": data.invoiceIncomeTaxDate,
                "Nilai PPN": data.incomeValue,
                "Dikenakan PPH": data.invoiceUseVat ? "Ya" : "Tidak",
                "Jenis PPH": data.invoiceVat,
                "No PPH": data.invoiceVatNo,
                "Tanggal PPH": data.invoiceVatDate,
                "Nilai PPH": data.vatValue,
                "No Nota Intern": data.interNoteNo,
                "Tanggal Nota Intern": data.interNoteDate,
                "Nilai Nota Intern": data.interNoteValue,
                "Tanggal Jatuh Tempo": data.interNoteDueDate,
                "No Koreksi": data.correctionNo,
                "Tanggal Koreksi": data.correctionDate,
                "Nilai Koreksi": data.correctionPriceTotal,
                "Ket Koreksi": data.correctionRemark,
                "Keterangan": data.remark,
                "Status": data.status
            }
            xls.data.push(item);
        }

        var options = {
            "No": "number",
            "Tanggal Purchase Request": "string",
            "No Purchase Request": "string",
            "Unit": "string",
            "Divisi": "string",
            "No Ref Purchase Request": "string",
            "No RO": "string",
            "Shipment Garment": "string",
            "Artikel": "string",
            "Kategori": "string",
            "Nama Barang": "string",
            "Kode Barang": "string",
            "Keterangan Barang": "string",
            "Jumlah Barang": "number",
            "Satuan Barang": "string",
            "Harga Barang": "number",
            "Harga Total": "number",
            "Mata Uang": "string",
            "Kurs": "number",
            "Harga Total Rp": "number",
            "Kode Supplier": "string",
            "Nama Supplier": "string",
            "Tanggal Terima PO Internal": "string",
            "No PO Eksternal": "string",
            "Tanggal PO Eksternal": "string",
            "Tanggal Target Datang": "string",
            "Dikenakan PPN": "string",
            "Dikenakan PPH": "string",
            "PPH": "string",
            "No Surat Jalan": "string",
            "Dikenakan Bea Cukai": "string",
            "Tanggal Surat Jalan": "string",
            "Tanggal Datang Barang": "string",
            "Jumlah Barang Datang": "number",
            "Satuan": "string",
            "Jumlah Barang Sisa": "string",
            "No Bea Cukai": "string",
            "Tanggal Bea Cukai": "string",
            "No Bon Terima Unit": "string",
            "Tanggal Bon Terima Unit": "string",
            "Jumlah Barang Diterima": "number",
            "Satuan Barang Diterima": "string",
            "No Invoice": "string",
            "Tanggal Invoice": "string",
            "Dikenakan PPN": "string",
            "No PPN": "string",
            "Tanggal PPN": "string",
            "Nilai PPN": "number",
            "Dikenakan PPH": "string",
            "Jenis PPH": "string",
            "No PPH": "string",
            "Tanggal PPH": "string",
            "Nilai PPH": "number",
            "No Nota Intern": "string",
            "Tanggal Nota Intern": "string",
            "Nilai Nota Intern": "string",
            "Tanggal Jatuh Tempo": "string",
            "No Koreksi": "string",
            "Tanggal Koreksi": "string",
            "Nilai Koreksi": "string",
            "Ket Koreksi": "string",
            "Keterangan": "string",
            "Status": "string"
        };
        xls.options = options;

        if (query.dateFrom && query.dateTo) {
            xls.name = `Laporan Monitoring Pembelian - ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Laporan Monitoring Pembelian - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Laporan Monitoring Pembelian - ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Laporan Monitoring Pembelian.xlsx`;

        return Promise.resolve(xls);
    }

    getPurchaseReportAll(info) {
        var query = {
            _deleted: false,
            isClosed: true,
            "items.isClosed": true,
        };

        if (info.state && info.state !== -1) {
            Object.assign(query, {
                "status.value": info.state
            });
        }
        if (info.user && info.user !== "" ) {
            Object.assign(query, {      
                "_createdBy": info.user
            });
        }
        if (info.unitId && info.unitId !== "") {
            Object.assign(query, {
                unitId: new ObjectId(info.unitId)
            });
        }
        if (info.categoryId && info.categoryId !== "") {
            Object.assign(query, {
                "items.categoryId": new ObjectId(info.categoryId)
            });
        }
        if (info.purchaseOrderExternalNo && info.purchaseOrderExternalNo !== "") {
            var regexPOExt = new RegExp(info.purchaseOrderExternalNo, "i");
            Object.assign(query, {
                "items.purchaseOrderExternal.no": {
                    '$regex': regexPOExt
                }
            });
        }
        if (info.supplierId && info.supplierId !== "") {
            Object.assign(query, {
                "items.supplierId": new ObjectId(info.supplierId)
            });
        }
        if (info.artikel && info.artikel !== "") {
            var regex = new RegExp(info.artikel, "i");
            Object.assign(query, {
                artikel: {
                    '$regex': regex
                }
            });
        }
        if (info.prRefNo && info.prRefNo !== "") {
            Object.assign(query, {
                "items.refNo": info.prRefNo
            });
        }
        if (info.roNo && info.roNo !== "") {
            Object.assign(query, {
                "roNo": info.roNo
            });
        }
        if (info.deliveryOrderNo && info.deliveryOrderNo !== "") {
            var regexSJ = new RegExp(info.deliveryOrderNo, "i");
            Object.assign(query, {
                "items.fulfillments.deliveryOrderNo": {
                    '$regex': regexSJ
                }
            })
        }

        var offset = Number(info.offset) || 7;
        var page = (Number(info.page) || 1) - 1;
        var size = Number(info.size) || 25;
        var _dateNow = new Date();
        var dateFormat = "DD/MM/YYYY";

        if (info.dateFrom && info.dateFrom !== "" && info.dateTo && info.dateTo !== "") {
            var _dateFrom = new Date(info.dateFrom);
            var _dateTo = new Date(info.dateTo);
            _dateFrom.setHours(_dateFrom.getHours() - offset);
            _dateTo.setHours(_dateTo.getHours() - offset);
            Object.assign(query, {
                "purchaseRequest.date": {
                    $gte: _dateFrom,
                    $lte: _dateTo
                }
            });
        } else if (info.dateFrom && info.dateFrom !== "") {
            if (!info.dateTo && info.dateTo === "") {
                var _dateFrom = new Date(info.dateFrom);
                if (_dateNow > _dateFrom) {
                    var _dateTo = new Date();
                    _dateFrom.setHours(_dateFrom.getHours() - offset);
                    _dateTo.setHours(_dateTo.getHours() - offset);
                    Object.assign(query, {
                        "purchaseRequest.date": {
                            $gte: _dateFrom,
                            $lte: _dateTo
                        }
                    });
                }
            }
        } else if (info.dateTo && info.dateTo !== "") {
            if (!info.dateFrom && info.dateFrom === "") {
                var _dateTo = new Date(info.dateTo);
                if (_dateNow < _dateTo) {
                    var _dateFrom = new Date();
                    _dateFrom.setHours(_dateFrom.getHours() - offset);
                    _dateTo.setHours(_dateTo.getHours() - offset);
                    Object.assign(query, {
                        "purchaseRequest.date": {
                            $gte: _dateFrom,
                            $lte: _dateTo
                        }
                    });
                }
            }
        }

        return this._createIndexes()
            .then((createIndexResults) => {
                var getDataPromise = [];
                getDataPromise.push(
                    this.collection
                        .aggregate([
                            {
                                $match: query
                            },
                            {
                                $unwind: { path: "$items", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $unwind: { path: "$items.fulfillments", preserveNullAndEmptyArrays: true }
                            },
                            { $group: { _id: null, count: { $sum: 1 } } }
                        ])
                        .toArray()
                );

                if (info.xls) {
                    getDataPromise.push(
                        this.collection
                            .aggregate([
                                {
                                    $match: query
                                },
                                {
                                    $unwind: { path: "$items", preserveNullAndEmptyArrays: true }
                                },
                                {
                                    $project: {
                                        "prDate": "$purchaseRequest.date",
                                        "prNo": "$purchaseRequest.no",
                                        "prCreatedDate": "$purchaseRequest._createdDate",
                                        "unit.name": 1,
                                        "unit.division.name": 1,
                                        "refNo": "$items.refNo",
                                        "roNo": "$roNo",
                                        "buyer.code": "$buyer.code",
                                        "buyer.name": "$buyer.name",
                                        "purchaseRequest.shipmentDate": "$purchaseRequest.shipmentDate",
                                        "artikel": "$artikel",
                                        "product.name": "$items.product.name",
                                        "product.code": "$items.product.code",
                                        "product.description": "$items.remark",
                                        "category": "$items.category.name",
                                        "defaultQuantity": "$items.defaultQuantity",
                                        "defaultUom": "$items.defaultUom.unit",
                                        "budgetPrice": "$items.budgetPrice",
                                        "currencyRate": "$items.currency.rate",
                                        "dealQuantity": "$items.dealQuantity",
                                        "currency": "$items.currency.code",
                                        "dealUom": "$items.dealUom.unit",
                                        "pricePerDealUnit": "$items.pricePerDealUnit",
                                        "supplier.name": "$items.supplier.name",
                                        "supplier.code": "$items.supplier.code",
                                        "_createdDate": 1,
                                        "poeNo": "$items.purchaseOrderExternal.no",
                                        "poeDate": "$items.purchaseOrderExternal.date",
                                        "poeExpectedDeliveryDate": "$items.purchaseOrderExternal.expectedDeliveryDate",
                                        "usePPN": "$items.purchaseOrderExternal.useIncomeTax",
                                        "usePPH": "$items.purchaseOrderExternal.useVat",
                                        "vatRate": "$items.purchaseOrderExternal.vatRate",
                                        "status": 1,
                                        "fulfillments": "$items.fulfillments",
                                        "fulfillmentsTotal": "$items.fulfillments.deliveryOrderDeliveredQuantity",
                                        "remark": "$items.remark",
                                        "_createdBy": "$_createdBy"
                                    }
                                },
                                {
                                    $unwind: { path: "$fulfillments", preserveNullAndEmptyArrays: true, includeArrayIndex: "arrayIndex" }
                                },
                                {
                                    $project: {
                                        "prDate": 1,
                                        "prNo": 1,
                                        "prCreatedDate": 1,
                                        "unit.name": 1,
                                        "unit.division.name": 1,
                                        "refNo": 1,
                                        "roNo": 1,
                                        "buyer.code": 1,
                                        "buyer.name": 1,
                                        "purchaseRequest.shipmentDate": 1,
                                        "artikel": 1,
                                        "product.name": 1,
                                        "product.code": 1,
                                        "product.description": 1,
                                        "category": 1,
                                        "defaultQuantity": 1,
                                        "defaultUom": 1,
                                        "budgetPrice": 1,
                                        "currencyRate": 1,
                                        "dealQuantity": 1,
                                        "currency": 1,
                                        "dealUom": 1,
                                        "pricePerDealUnit": 1,
                                        "supplier.name": 1,
                                        "supplier.code": 1,
                                        "_createdDate": 1,
                                        "poeNo": 1,
                                        "poeDate": 1,
                                        "poeExpectedDeliveryDate": 1,
                                        "usePPN": 1,
                                        "usePPH": 1,
                                        "vatRate": 1,
                                        "status": 1,
                                        "fulfillment": "$fulfillments",
                                        "fulfillmentsTotal": 1,
                                        "arrayIndex": 1,
                                        "remark": 1,
                                        "_createdBy": 1
                                    }
                                },
                                { $sort : { "refNo" : 1 } }
                            ])
                            .toArray()
                    );
                } else {
                    getDataPromise.push(this.collection
                        .aggregate([
                            {
                                $match: query
                            },
                            {
                                $unwind: { path: "$items", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $project: {
                                    "prDate": "$purchaseRequest.date",
                                    "prNo": "$purchaseRequest.no",
                                    "prCreatedDate": "$purchaseRequest._createdDate",
                                    "unit.name": 1,
                                    "unit.division.name": 1,
                                    "refNo": "$items.refNo",
                                    "roNo": "$roNo",
                                    "buyer.code": "$buyer.code",
                                    "buyer.name": "$buyer.name",
                                    "purchaseRequest.shipmentDate": "$purchaseRequest.shipmentDate",
                                    "artikel": "$artikel",
                                    "product.name": "$items.product.name",
                                    "product.code": "$items.product.code",
                                    "product.description": "$items.remark",
                                    "category": "$items.category.name",
                                    "defaultQuantity": "$items.defaultQuantity",
                                    "defaultUom": "$items.defaultUom.unit",
                                    "budgetPrice": "$items.budgetPrice",
                                    "currencyRate": "$items.currency.rate",
                                    "dealQuantity": "$items.dealQuantity",
                                    "currency": "$items.currency.code",
                                    "dealUom": "$items.dealUom.unit",
                                    "pricePerDealUnit": "$items.pricePerDealUnit",
                                    "supplier.name": "$items.supplier.name",
                                    "supplier.code": "$items.supplier.code",
                                    "_createdDate": 1,
                                    "poeNo": "$items.purchaseOrderExternal.no",
                                    "poeDate": "$items.purchaseOrderExternal.date",
                                    "poeExpectedDeliveryDate": "$items.purchaseOrderExternal.expectedDeliveryDate",
                                    "usePPN": "$items.purchaseOrderExternal.useIncomeTax",
                                    "usePPH": "$items.purchaseOrderExternal.useVat",
                                    "vatRate": "$items.purchaseOrderExternal.vatRate",
                                    "status": 1,
                                    "fulfillments": "$items.fulfillments",
                                    "fulfillmentsTotal": "$items.fulfillments.deliveryOrderDeliveredQuantity",
                                    "remark": "$items.remark",
                                    "_createdBy": "$_createdBy"
                                }
                            },
                            {
                                $unwind: { path: "$fulfillments", preserveNullAndEmptyArrays: true, includeArrayIndex: "arrayIndex" }
                            },
                            {
                                $project: {
                                    "prDate": 1,
                                    "prNo": 1,
                                    "prCreatedDate": 1,
                                    "unit.name": 1,
                                    "unit.division.name": 1,
                                    "refNo": 1,
                                    "roNo": 1,
                                    "buyer.code": 1,
                                    "buyer.name": 1,
                                    "purchaseRequest.shipmentDate": 1,
                                    "artikel": 1,
                                    "product.name": 1,
                                    "product.code": 1,
                                    "product.description": 1,
                                    "category": 1,
                                    "defaultQuantity": 1,
                                    "defaultUom": 1,
                                    "budgetPrice": 1,
                                    "currencyRate": 1,
                                    "dealQuantity": 1,
                                    "currency": 1,
                                    "dealUom": 1,
                                    "pricePerDealUnit": 1,
                                    "supplier.name": 1,
                                    "supplier.code": 1,
                                    "_createdDate": 1,
                                    "poeNo": 1,
                                    "poeDate": 1,
                                    "poeExpectedDeliveryDate": 1,
                                    "usePPN": 1,
                                    "usePPH": 1,
                                    "vatRate": 1,
                                    "status": 1,
                                    "fulfillment": "$fulfillments",
                                    "fulfillmentsTotal": 1,
                                    "arrayIndex": 1,
                                    "remark": 1,
                                    "_createdBy": 1
                                }
                            },
                            { $sort : { "refNo" : 1 } },
                            { $skip: page * size },
                            { $limit: size }
                        ])
                        .toArray()
                    );
                }

                return Promise.all(getDataPromise);
            })
            .then(result => {
                var resCount = result[0];
                var count = resCount.length > 0 ? resCount[0].count : 0;
                var listData = result[1];
                var dataReport = [];
                var index = 0;

                for (var data of listData) {
                    var incomeValue = 0, vatValue = 0;
                    var remainQuantity = 0;
                    var sum = 0;

                    if (data.arrayIndex || data.arrayIndex >= 0) {
                        sum = 0;
                        for (var i = 0; i <= data.arrayIndex; i++) {
                            sum += data.fulfillmentsTotal[i];
                        }
                    }
                    remainQuantity = data.dealQuantity - sum;

                    if (data.fulfillment) {
                        if (data.fulfillment.invoiceUseIncomeTax) {
                            incomeValue = (data.fulfillment.deliveryOrderDeliveredQuantity || 0) * data.pricePerDealUnit * data.currencyRate * 0.1;
                        }
                        if (data.fulfillment.invoiceUseVat) {
                            vatValue = (data.fulfillment.deliveryOrderDeliveredQuantity || 0) * data.pricePerDealUnit * data.currencyRate * data.fulfillment.invoiceVat.rate / 100;
                        }
                        if (data.fulfillment.corrections) {
                            var i = 1;
                            var _correctionNo = "";
                            var _correctionPriceTotal = "";
                            var _correctionDate = "";
                            var _correctionType = "";
                            for (var correction of data.fulfillment.corrections) {
                                var total = (correction.newPriceTotal - correction.oldPriceTotal) * correction.currencyRate
                                _correctionNo = `${_correctionNo}${i}. ${correction.correctionNo}\n`;
                                _correctionPriceTotal = `${_correctionPriceTotal}${i}. ${total.toLocaleString()}\n`;
                                _correctionDate = `${_correctionDate}${i}. ${moment(new Date(correction.correctionDate)).add(offset, 'h').format(dateFormat)}\n`;
                                _correctionType = `${_correctionType}${i}. ${correction.correctionType}\n`;
                                i++;
                            }
                            data.correction = {
                                correctionNo: _correctionNo,
                                correctionPriceTotal: _correctionPriceTotal,
                                correctionDate: _correctionDate,
                                correctionType: _correctionType
                            }
                        }
                    } else {
                        data.correction = {};
                    }
                    index++;
                    if (!data.supplier) {
                        data.supplier = {
                            code: "",
                            name: ""
                        }
                    }
                    var item = {
                        no: index,
                        prDate: data.prDate ? moment(new Date(data.prDate)).add(offset, 'h').format(dateFormat) : "-",
                        prNo: data.prNo,
                        unit: data.unit.name,
                        division: data.unit.division.name,
                        refNo: data.refNo,
                        roNo: data.roNo,
                        buyerCode: data.buyer.code,
                        buyerName: data.buyer.name,
                        shipmentDate: data.purchaseRequest.shipmentDate ? moment(new Date(data.purchaseRequest.shipmentDate)).add(offset, 'h').format(dateFormat): "-",
                        artikel: data.artikel,
                        planpo: data.planpo,
                        category: data.category,
                        productName: data.product.name,
                        productCode: data.product.code,
                        productDesc: data.product.description,
                        defaultQuantity: data.defaultQuantity ? data.defaultQuantity : 0,
                        defaultUom: data.defaultUom ? data.defaultUom : "-",
                        dealUom: data.dealUom ? data.dealUom : "-",
                        budgetPrice: data.budgetPrice,
                        pricePerItem: data.pricePerDealUnit,
                        priceTotal: data.pricePerDealUnit * data.dealQuantity,
                        priceTtl: data.pricePerDealUnit * data.dealQuantity * data.currencyRate,
                        currencyRate: data.currencyRate,
                        supplierCode: data.supplier.code,
                        supplierName: data.supplier.name,
                        poIntCreatedDate: data._createdDate ? moment(new Date(data._createdDate)).add(offset, 'h').format(dateFormat) : "-",
                        poExtNo: data.poeNo,
                        poExtDate: data.poeDate ? moment(new Date(data.poeDate)).add(offset, 'h').format(dateFormat) : "-",
                        poExtExpectedDeliveryDate: data.poeExpectedDeliveryDate ? moment(new Date(data.poeExpectedDeliveryDate)).add(offset, 'h').format(dateFormat) : "-",
                        poExtPPN: data.usePPN ? "Ya" : "Tidak",
                        poExtPPH: data.usePPH ? "Ya" : "Tidak",
                        poExtVat: data.vatRate ? data.vatRate : "-",
                        dealQuantity: data.dealQuantity ? data.dealQuantity : 0,
                        currency: data.currency,
                        deliveryOrderNo: data.fulfillment ? data.fulfillment.deliveryOrderNo ? data.fulfillment.deliveryOrderNo : "-" : "-",
                        deliveryOrderUseCustoms: data.fulfillment ? data.fulfillment.deliveryOrderUseCustoms ? data.fulfillment.deliveryOrderUseCustoms : false : false,
                        supplierDoDate: data.fulfillment ? data.fulfillment.supplierDoDate ? moment(new Date(data.fulfillment.supplierDoDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        deliveryOrderDate: data.fulfillment ? data.fulfillment.deliveryOrderDate ? moment(new Date(data.fulfillment.deliveryOrderDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        deliveryOrderDeliveredQuantity: data.fulfillment ? data.fulfillment.deliveryOrderDeliveredQuantity ? data.fulfillment.deliveryOrderDeliveredQuantity : 0 : 0,
                        deliveryOrderDeliveredUom: data.defaultUom ? data.defaultUom : "-",
                        remainQuantity: remainQuantity,
                        customsNo: data.fulfillment ? data.fulfillment.customsNo ? data.fulfillment.customsNo : "-" : "-",
                        customsDate: data.fulfillment ? data.fulfillment.customsDate ? moment(new Date(data.fulfillment.customsDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        unitReceiptNoteNo: data.fulfillment ? data.fulfillment.unitReceiptNoteNo ? data.fulfillment.unitReceiptNoteNo : "-" : "-",
                        unitReceiptNoteDate: data.fulfillment ? data.fulfillment.unitReceiptNoteDate ? moment(new Date(data.fulfillment.unitReceiptNoteDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        unitReceiptNoteDeliveredQuantity: data.fulfillment ? data.fulfillment.unitReceiptNoteDeliveredQuantity ? data.fulfillment.unitReceiptNoteDeliveredQuantity : 0 : 0,
                        unitReceiptDeliveredUom: data.fulfillment ? data.fulfillment.unitReceiptDeliveredUom ? data.fulfillment.unitReceiptDeliveredUom.unit : "-" : "-",
                        invoiceNo: data.fulfillment ? data.fulfillment.invoiceNo ? data.fulfillment.invoiceNo : "-" : "-",
                        invoiceDate: data.fulfillment ? data.fulfillment.invoiceDate ? moment(new Date(data.fulfillment.invoiceDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        invoiceUseIncomeTax: data.fulfillment ? data.fulfillment.invoiceUseIncomeTax ? data.fulfillment.invoiceUseIncomeTax : false : false,
                        invoiceIncomeTaxNo: data.fulfillment ? data.fulfillment.invoiceIncomeTaxNo ? data.fulfillment.invoiceIncomeTaxNo : "-" : "-",
                        invoiceIncomeTaxDate: data.fulfillment ? data.fulfillment.invoiceIncomeTaxDate ? moment(new Date(data.fulfillment.invoiceIncomeTaxDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        incomeValue: incomeValue,
                        invoiceUseVat: data.fulfillment ? data.fulfillment.invoiceUseVat ? data.fulfillment.invoiceUseVat : false : false,
                        invoiceVat: data.fulfillment ? data.fulfillment.invoiceVat ? `${data.fulfillment.invoiceVat.name} ${data.fulfillment.invoiceVat.rate}` : "-" : "-",
                        invoiceVatNo: data.fulfillment ? data.fulfillment.invoiceVatNo ? data.fulfillment.invoiceVatNo : "-" : "-",
                        invoiceVatDate: data.fulfillment ? data.fulfillment.invoiceVatDate ? moment(new Date(data.fulfillment.invoiceVatDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        vatValue: vatValue,
                        interNoteNo: data.fulfillment ? data.fulfillment.interNoteNo ? data.fulfillment.interNoteNo : "-" : "-",
                        interNoteDate: data.fulfillment ? data.fulfillment.interNoteDate ? moment(new Date(data.fulfillment.interNoteDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        interNoteValue: data.fulfillment ? data.fulfillment.interNoteQuantity && data.fulfillment.interNotePrice ? (data.fulfillment.interNoteQuantity * data.fulfillment.interNotePrice) : 0 : 0,
                        interNoteDueDate: data.fulfillment ? data.fulfillment.interNoteDueDate ? moment(new Date(data.fulfillment.interNoteDueDate)).add(offset, 'h').format(dateFormat) : "-" : "-",
                        correctionNo: data.correction ? data.correction.correctionNo : "-",
                        correctionDate: data.correction ? data.correction.correctionDate : "-",
                        correctionPriceTotal: data.correction ? data.correction.correctionPriceTotal : 0,
                        correctionRemark: data.correction ? data.correction.correctionType : "-",
                        remark: data.remark ? data.remark : "-",
                        status: data.status ? data.status.label : "-",
                        statusValue: data.status ? data.status.value : 0,
                        _createdBy: data._createdBy ? data._createdBy : "_"
                    }
                    dataReport.push(item);
                }

                var result = {
                    data: dataReport,
                    count: dataReport.length,
                    size: size,
                    total: count,
                    page: page + 1
                };

                return Promise.resolve(result);
            })
    }

    getXlsPurchaseReportAll(results, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';
        var offset = query.offset || 7;
        var dateFormat = "DD/MM/YYYY";

        for (var data of results.data) {
            var item = {
                "No": data.no,
                "Tanggal Purchase Request": data.prDate,
                "No Purchase Request": data.prNo,
                "Unit": data.unit,
                "Divisi": data.division,
                "No Ref Purchase Request": data.refNo,
                "No RO": data.roNo,
                "Buyer": data.buyerCode,
                "Nama Buyer": data.buyerName,
                "Shipment Garment": data.shipmentDate,
                "Artikel": data.artikel,
                "Kategori": data.category,
                "Nama Barang": data.productName,
                "Kode Barang": data.productCode,
                "Keterangan Barang": data.productDesc,
                "Jumlah Barang": data.dealQuantity,
                "Satuan Barang": data.dealUom,
                "Harga Budget": data.budgetPrice,
                "Harga Satuan Beli": data.pricePerItem,
                "Harga Total": data.priceTotal,
                "Mata Uang": data.currency,
                "Kurs": data.currencyRate,
                "Harga Total Rp": data.priceTtl,
                "Kode Supplier": data.supplierCode,
                "Nama Supplier": data.supplierName,
                "Tanggal Terima PO Internal": data.poIntCreatedDate,
                "No PO Eksternal": data.poExtNo,
                "Tanggal PO Eksternal": data.poExtDate,
                "Tanggal Target Datang": data.poExtExpectedDeliveryDate,
                "Dikenakan PPN": data.poExtPPN,
                "Dikenakan PPH": data.poExtPPH,
                "PPH": data.poExtVat,
                "No Surat Jalan": data.deliveryOrderNo,
                "Dikenakan Bea Cukai": data.deliveryOrderUseCustoms ? "Ya" : "Tidak",
                "Tanggal Surat Jalan": data.supplierDoDate,
                "Tanggal Datang Barang": data.deliveryOrderDate,
                "Jumlah Barang Datang": data.deliveryOrderDeliveredQuantity,
                "Satuan": data.dealUom,
                "Jumlah Barang Sisa": data.remainQuantity,
                "No Bea Cukai": data.customsNo,
                "Tanggal Bea Cukai": data.customsDate,
                "No Bon Terima Unit": data.unitReceiptNoteNo,
                "Tanggal Bon Terima Unit": data.unitReceiptNoteDate,
                "Jumlah Barang Diterima": data.unitReceiptNoteDeliveredQuantity,
                "Satuan Barang Diterima": data.unitReceiptDeliveredUom,
                "No Invoice": data.invoiceNo,
                "Tanggal Invoice": data.invoiceDate,
                "Dikenakan PPN": data.invoiceUseIncomeTax ? "Ya" : "Tidak",
                "No PPN": data.invoiceIncomeTaxNo,
                "Tanggal PPN": data.invoiceIncomeTaxDate,
                "Nilai PPN": data.incomeValue,
                "Dikenakan PPH": data.invoiceUseVat ? "Ya" : "Tidak",
                "Jenis PPH": data.invoiceVat,
                "No PPH": data.invoiceVatNo,
                "Tanggal PPH": data.invoiceVatDate,
                "Nilai PPH": data.vatValue,
                "No Nota Intern": data.interNoteNo,
                "Tanggal Nota Intern": data.interNoteDate,
                "Nilai Nota Intern": data.interNoteValue,
                "Tanggal Jatuh Tempo": data.interNoteDueDate,
                "No Koreksi": data.correctionNo,
                "Tanggal Koreksi": data.correctionDate,
                "Nilai Koreksi": data.correctionPriceTotal,
                "Ket Koreksi": data.correctionRemark,
                "Keterangan": data.remark,
                "Status": data.status,
                "_createdBy": data._createdBy
            }
            xls.data.push(item);
        }

        var options = {
            "No": "number",
            "Tanggal Purchase Request": "string",
            "No Purchase Request": "string",
            "Unit": "string",
            "Divisi": "string",
            "No Ref Purchase Request": "string",
            "No RO": "string",
            "Buyer": "string",
            "Nama Buyer": "string",
            "Shipment Garment": "string",
            "Artikel": "string",
            "Kategori": "string",
            "Nama Barang": "string",
            "Kode Barang": "string",
            "Keterangan Barang": "string",
            "Jumlah Barang": "number",
            "Satuan Barang": "string",
            "Harga Barang": "number",
            "Harga Total": "number",
            "Mata Uang": "string",
            "Kurs": "number",
            "Harga Total Rp": "number",
            "Kode Supplier": "string",
            "Nama Supplier": "string",
            "Tanggal Terima PO Internal": "string",
            "No PO Eksternal": "string",
            "Tanggal PO Eksternal": "string",
            "Tanggal Target Datang": "string",
            "Dikenakan PPN": "string",
            "Dikenakan PPH": "string",
            "PPH": "string",
            "No Surat Jalan": "string",
            "Dikenakan Bea Cukai": "string",
            "Tanggal Surat Jalan": "string",
            "Tanggal Datang Barang": "string",
            "Jumlah Barang Datang": "number",
            "Satuan": "string",
            "Jumlah Barang Sisa": "string",
            "No Bea Cukai": "string",
            "Tanggal Bea Cukai": "string",
            "No Bon Terima Unit": "string",
            "Tanggal Bon Terima Unit": "string",
            "Jumlah Barang Diterima": "number",
            "Satuan Barang Diterima": "string",
            "No Invoice": "string",
            "Tanggal Invoice": "string",
            "Dikenakan PPN": "string",
            "No PPN": "string",
            "Tanggal PPN": "string",
            "Nilai PPN": "number",
            "Dikenakan PPH": "string",
            "Jenis PPH": "string",
            "No PPH": "string",
            "Tanggal PPH": "string",
            "Nilai PPH": "number",
            "No Nota Intern": "string",
            "Tanggal Nota Intern": "string",
            "Nilai Nota Intern": "string",
            "Tanggal Jatuh Tempo": "string",
            "No Koreksi": "string",
            "Tanggal Koreksi": "string",
            "Nilai Koreksi": "string",
            "Ket Koreksi": "string",
            "Keterangan": "string",
            "Status": "string",
            "Staff Input": "string"
        };
        xls.options = options;

        if (query.dateFrom && query.dateTo) {
            xls.name = `Laporan Monitoring Pembelian All - ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Laporan Monitoring Pembelian All - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Laporan Monitoring Pembelian All - ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Laporan Monitoring Pembelian All.xlsx`;
        return Promise.resolve(xls);
    }


getDataKirim( dateFrom, dateTo, offset) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                
                      var qryMatch = {};
            qryMatch["$and"] = [
                { "_deleted": false },
                { "isPosted": true }, {
                        "items.category.name":{$ne:"SUBKON"} 
                    },
                     {
                        "items.category.name":{$ne:"INTERLINING"} 
                    },
                     {
                        "items.category.name":{$ne:"PROCESS"} 
                    },
                     {
                        "items.category.name":{$ne:"WASH"} 
                    },
                     {
                        "items.category.name":{$ne:"PRINT"} 
                    }
                    ,
                     {
                        "items.category.name":{$ne:"PLISKET"} 
                    }
                    ,
                     {
                        "items.category.name":{$ne:"EMBROIDERY"} 
                    }];

if (dateFrom && dateFrom !== ""  && dateTo && dateTo !== "" ) {
                var validStartDate = new Date(dateFrom);
                var validEndDate = new Date(dateTo);
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);

                qryMatch["$and"].push(
                    {
                        "items.fulfillments.supplierDoDate": {
                            $gte: validStartDate,
                            $lte: validEndDate
                        }
                    })
            }
           
          

 var bbbb = new Date();
             bbbb.setHours(bbbb.getHours() );
          var aaaa = { $ifNull: ["$items.purchaseOrderExternal.expectedDeliveryDate", bbbb] };       
  
var dates = {
                $divide: [{
                    $subtract: [{
                        $subtract: [
                            { "$add": ["$items.fulfillments.supplierDoDate" , 60 * 60 * 1000 ] },
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
                                            { "$hour": { "$add": ["$items.fulfillments.supplierDoDate", 60 * 60 * 1000 ] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }
                        ]
                    }, {
                        $subtract: [
                            { "$add": [aaaa, 60 * 60 * 1000] },
                            {
                                "$add": [
                                    { "$millisecond": aaaa },
                                    {
                                        "$multiply": [
                                            { "$second": aaaa },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": aaaa },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": [aaaa, 60 * 60 * 1000 ] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }]
                    }]
                }, 86400000]
            };

  
  
                    return this.collection
                        .aggregate([
                            {
                            $match: qryMatch
                            },
                            
                              {
                               $unwind: { path: "$items", preserveNullAndEmptyArrays: false }
                            },
                            {
                               $unwind: { path: "$items.fulfillments", preserveNullAndEmptyArrays: false }
                            },
                
                              {
                                "$project": {
                                //  "tgl1": "$items.purchaseOrderExternal.expectedDeliveryDate",
                                //  "tgl2": "$items.fulfillments.supplierDoDate",
                                 "supplier": "$items.supplier.name",
                                 "kdsupplier": "$items.supplier.code",
                                 "selisih": dates,
                                 "Ok": {  // Set to 1 if value < 10
                $cond: [ { $lt: [dates, 5 ] }, 1, 0]
            },
                                 "NotOk":  {  // Set to 1 if value > 10
                $cond: [ { $gt: [ dates, 5 ] }, 1, 0]
            },
                            
                                }
                            },
                           {
                        $group: {
                            _id: { supplier: "$supplier",kdsupplier: "$kdsupplier"} ,
                             "Ok": { $sum: "$Ok" },
                             "NotOk": { $sum: "$NotOk" },
                                 count: { $sum: 1 }
                             
                        }
                             }, 
                             {
                                "$project": {
                                 "Ok": "$Ok",
                                 "NotOk": "$NotOk",
                                 "count": "$count",
                                 "_id.supplier": "$_id.supplier",
                                 "_id.kdsupplier": "$_id.kdsupplier",
                                "Cek":{$multiply:[{$divide:["$Ok","$count"]},100]},
                                }
                            },
                              {
                        $sort: 
                            { "_id.supplier": 1} 
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
            });
    }



 getDataKirimSub(supplier,dateFrom,dateTo,offset) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {

                      var qryMatch = {};

                          
            qryMatch["$and"] = [
                { "_deleted": false },
                { "isPosted": true }, {
                        "items.category.name":{$ne:"SUBKON"} 
                    },
                     {
                        "items.category.name":{$ne:"INTERLINING"} 
                    },
                     {
                        "items.category.name":{$ne:"PROCESS"} 
                    },
                     {
                        "items.category.name":{$ne:"WASH"} 
                    },
                     {
                        "items.category.name":{$ne:"PRINT"} 
                    }
                    ,
                     {
                        "items.category.name":{$ne:"PLISKET"} 
                    }
                    ,
                     {
                        "items.category.name":{$ne:"EMBROIDERY"} 
                    }];

          if (dateFrom && dateFrom !== ""  && dateTo && dateTo !== "" ) {
                var validStartDate = new Date(dateFrom);
                var validEndDate = new Date(dateTo);
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
       
                qryMatch["$and"].push(
                    {
                        "items.fulfillments.supplierDoDate": {
                            $gte: validStartDate,
                            $lte: validEndDate
                        }
                    })
              
            }

        if (supplier !== "") {
                             qryMatch["$and"].push(
                   {
                         "items.supplier.code":supplier
                     })
        
        }
       

          
        
 var bbbb = new Date();
             bbbb.setHours(bbbb.getHours() );
          var aaaa = { $ifNull: ["$items.purchaseOrderExternal.expectedDeliveryDate", bbbb] };
  
var dates = {
                $divide: [{
                    $subtract: [{
                        $subtract: [
                            { "$add": ["$items.fulfillments.supplierDoDate" , 60 * 60 * 1000 ] },
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
                                            { "$hour": { "$add": ["$items.fulfillments.supplierDoDate", 60 * 60 * 1000 ] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }
                        ]
                    }, {
                        $subtract: [
                            { "$add": [aaaa, 60 * 60 * 1000] },
                            {
                                "$add": [
                                    { "$millisecond": aaaa },
                                    {
                                        "$multiply": [
                                            { "$second": aaaa },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": aaaa },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": [aaaa, 60 * 60 * 1000 ] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }]
                    }]
                }, 86400000]
            };

                    return this.collection
                        .aggregate([
                    
                            {
                            $match: qryMatch
                            },
                            
                              {
                               $unwind: { path: "$items", preserveNullAndEmptyArrays: false }
                            },
                             {
                               $unwind: { path: "$items.fulfillments", preserveNullAndEmptyArrays: false }
                            },
                             
                              {
                                "$project": {
                             
                                    "refNo": "$items.refNo",
                                    "roNo": "$roNo",
                                    "purchaseRequestshipmentDate": "$items.purchaseOrderExternal.expectedDeliveryDate",
                                    "artikel": "$artikel",
                                    "productname": "$items.product.name",
                                    "productcode": "$items.product.code",
                                    "productdescription": "$items.remark",
                                    "category": "$items.category.name",
                                     "supplier": "$items.supplier.name",
                                    "suppliercode": "$items.supplier.code",
                                    "selisih": dates,
                                    "poeNo": "$items.purchaseOrderExternal.no",
                                    "poeDate": "$items.purchaseOrderExternal.date",
                                    "remark": "$items.remark",
                                    "tglll": "$items.fulfillments.supplierDoDate",
                                    "tglpr": "$date",
                                    "tglpo": "$_createdDate",
                                    "_createdBy": "$_createdBy",
                                    "kategori": "$items.category.name",
                                
                            
                                }
                            },{
                        $sort: 
                            { "tglll": 1} 
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
            });
    }



    getDataTest( dateFrom, dateTo, kategori, offset) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                
                      var qryMatch = {};
            qryMatch["$and"] = [
                { "_deleted": false },
                { "isPosted": true }];


//if (dateFrom && dateFrom !== "" && dateFrom != "undefined" && dateTo && dateTo !== "" && dateTo != "undefined") {
if (dateFrom && dateFrom !== ""  && dateTo && dateTo !== "" ) {
                var validStartDate = new Date(dateFrom);
                var validEndDate = new Date(dateTo);
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);

                qryMatch["$and"].push(
                    {
                        "items.fulfillments.deliveryOrderDate": {
                            $gte: validStartDate,
                            $lte: validEndDate
                        }
                    })
            }
           
            var aa={$or:[{
                        "items.category.name":"FABRIC" 
                    },{
                        "items.category.name":"INTERLINING" 
                    }]} 
          

 var bbbb = new Date();
             bbbb.setHours(bbbb.getHours() );
          var aaaa = { $ifNull: ["$items.fulfillments.deliveryOrderDate", bbbb] };       
  
var dates = {
                $divide: [{
                    $subtract: [{
                        $subtract: [
                            { "$add": ["$purchaseRequest.shipmentDate" , 60 * 60 * 1000 ] },
                            {
                                "$add": [
                                    { "$millisecond": "$purchaseRequest.shipmentDate" },
                                    {
                                        "$multiply": [
                                            { "$second": "$purchaseRequest.shipmentDate" },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": "$purchaseRequest.shipmentDate" },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": ["$purchaseRequest.shipmentDate", 60 * 60 * 1000 ] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }
                        ]
                    }, {
                        $subtract: [
                            { "$add": [aaaa, 60 * 60 * 1000] },
                            {
                                "$add": [
                                    { "$millisecond": aaaa },
                                    {
                                        "$multiply": [
                                            { "$second": aaaa },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": aaaa },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": [aaaa, 60 * 60 * 1000 ] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }]
                    }]
                }, 86400000]
            };

  if (kategori == "Bahan Baku" ) {
                        qryMatch["$and"].push(
                            aa
                    )
                    var cmd = {  
                              $cond: [ { $gt: [ dates, 29 ] }, 1, 0]
                            };
                    var ncmd = { 
                                $cond: [ { $lt: [dates, 30 ] }, 1, 0]
                              };
                }
            if (kategori == "Bahan Pendukung" ) {
                        qryMatch["$and"].push(
                           {
                        "items.category.name":{$ne:"FABRIC"} 
                    },  {
                        "items.category.name":{$ne:"SUBKON"} 
                    },
                     {
                        "items.category.name":{$ne:"INTERLINING"} 
                    },
                     {
                        "items.category.name":{$ne:"PROCESS"} 
                    },
                     {
                        "items.category.name":{$ne:"WASH"} 
                    },
                     {
                        "items.category.name":{$ne:"PRINT"} 
                    }
                    ,
                     {
                        "items.category.name":{$ne:"PLISKET"} 
                    }
                    ,
                     {
                        "items.category.name":{$ne:"EMBROIDERY"} 
                    }
                    )

                      var cmd = {  
                              $cond: [ { $gt: [ dates, 19 ] }, 1, 0]
                            };
                    var  ncmd = { 
                                $cond: [ { $lt: [dates, 20 ] }, 1, 0]
                              };
                }

  
                    return this.collection
                        .aggregate([
                            {
                            $match: qryMatch
                            },
                            
                              {
                               $unwind: { path: "$items", preserveNullAndEmptyArrays: false }
                            },
                            {
                               $unwind: { path: "$items.fulfillments", preserveNullAndEmptyArrays: false }
                            },
                
                              {
                                "$project": {
                                 "tgl1": "$items.fulfillments.deliveryOrderDate",
                                 "tgl2": "$purchaseRequest.shipmentDate",
                                 "supplier": "$items.supplier.name",
                                 "kdsupplier": "$items.supplier.code",
                                 "selisih": dates,
                                 "NotOk": ncmd,
                                 "Ok": cmd,
                            
                                }
                            },
                           {
                        $group: {
                            _id: { supplier: "$supplier",kdsupplier: "$kdsupplier"} ,
                             "Ok": { $sum: "$Ok" },
                             "NotOk": { $sum: "$NotOk" },
                                 count: { $sum: 1 }
                             
                        }
                             }, 
                             {
                                "$project": {
                                 "Ok": "$Ok",
                                 "NotOk": "$NotOk",
                                 "count": "$count",
                                 "_id.supplier": "$_id.supplier",
                                 "_id.kdsupplier": "$_id.kdsupplier",
                                "Cek":{$multiply:[{$divide:["$Ok","$count"]},100]},
                                }
                            },
                              {
                        $sort: 
                            { Cek: 1,count: -1} 
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
            });
    }



    getDataTestSub(supplier,dateFrom,dateTo,kategori,offset) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {

                      var qryMatch = {};

                          
            qryMatch["$and"] = [
                { "_deleted": false },
                { "isPosted": true }];

          if (dateFrom && dateFrom !== ""  && dateTo && dateTo !== "" ) {
                var validStartDate = new Date(dateFrom);
                var validEndDate = new Date(dateTo);
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
       
                qryMatch["$and"].push(
                    {
                        "items.fulfillments.deliveryOrderDate": {
                            $gte: validStartDate,
                            $lte: validEndDate
                        }
                    })
              
            }

        if (supplier !== "") {
                             qryMatch["$and"].push(
                   {
                         "items.supplier.code":supplier
                     })
        
        }
         var aa={$or:[{
                        "items.category.name":"FABRIC" 
                    },{
                        "items.category.name":"INTERLINING" 
                    }]} 
          
            if (kategori == "Bahan Baku" ) {
                        qryMatch["$and"].push(
                            aa
                    )
                }
            if (kategori == "Bahan Pendukung" ) {
                        qryMatch["$and"].push(
                           {
                        "items.category.name":{$ne:"FABRIC"} 
                    },  {
                        "items.category.name":{$ne:"SUBKON"} 
                    },
                     {
                        "items.category.name":{$ne:"INTERLINING"} 
                    },
                     {
                        "items.category.name":{$ne:"PROCESS"} 
                    },
                     {
                        "items.category.name":{$ne:"WASH"} 
                    },
                     {
                        "items.category.name":{$ne:"PRINT"} 
                    }
                    ,
                     {
                        "items.category.name":{$ne:"PLISKET"} 
                    }
                    ,
                     {
                        "items.category.name":{$ne:"EMBROIDERY"} 
                    }
                    )
                }

          
        
 var bbbb = new Date();
             bbbb.setHours(bbbb.getHours() );
          var aaaa = { $ifNull: ["$items.fulfillments.deliveryOrderDate", bbbb] };
  
var dates = {
                $divide: [{
                    $subtract: [{
                        $subtract: [
                            { "$add": ["$purchaseRequest.shipmentDate" , 60 * 60 * 1000 ] },
                            {
                                "$add": [
                                    { "$millisecond": "$purchaseRequest.shipmentDate" },
                                    {
                                        "$multiply": [
                                            { "$second": "$purchaseRequest.shipmentDate" },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": "$purchaseRequest.shipmentDate" },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": ["$purchaseRequest.shipmentDate", 60 * 60 * 1000 ] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }
                        ]
                    }, {
                        $subtract: [
                            { "$add": [aaaa, 60 * 60 * 1000] },
                            {
                                "$add": [
                                    { "$millisecond": aaaa },
                                    {
                                        "$multiply": [
                                            { "$second": aaaa },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": aaaa },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": [aaaa, 60 * 60 * 1000 ] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }]
                    }]
                }, 86400000]
            };

                    return this.collection
                        .aggregate([
                    
                            {
                            $match: qryMatch
                            },
                            
                              {
                               $unwind: { path: "$items", preserveNullAndEmptyArrays: false }
                            },
                             {
                               $unwind: { path: "$items.fulfillments", preserveNullAndEmptyArrays: false }
                            },
                             
                              {
                                "$project": {
                             
                                    "refNo": "$items.refNo",
                                    "roNo": "$roNo",
                                    "purchaseRequestshipmentDate": "$purchaseRequest.shipmentDate",
                                    "artikel": "$artikel",
                                    "productname": "$items.product.name",
                                    "productcode": "$items.product.code",
                                    "productdescription": "$items.remark",
                                    "category": "$items.category.name",
                                     "supplier": "$items.supplier.name",
                                    "suppliercode": "$items.supplier.code",
                                    "selisih": dates,
                                    "poeNo": "$items.purchaseOrderExternal.no",
                                    "poeDate": "$items.purchaseOrderExternal.date",
                                    "remark": "$items.remark",
                                    "tglll": "$items.fulfillments.deliveryOrderDate",
                                    "tglpr": "$date",
                                    "tglpo": "$_createdDate",
                                    "_createdBy": "$_createdBy",
                                    "kategori": "$items.category.name",
                                
                            
                                }
                            },
                            {
                        $sort: 
                            { "tglll": 1} 
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
            });
    }

getDurationPOIntPoExt(query) {
        return new Promise((resolve, reject) => {
            var deletedQuery = {
                _deleted: false
            };
            var postedQuery = {
                isPosted: true
            };
            var closedQuery = {
                isClosed: true
            };
            // Tgl Po Internal
            var date = {
                "_createdDate": {
                    "$gte": (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                    "$lte": (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                }
            };
            var offset = query.offset;
            
            var userQuery = {};
            if (query.user && query.user != "") {
                userQuery = { 
                    "_createdBy": query.user 
                }
            }

            var unitQuery = {};
            if (query.unitId && query.unitId != "") {
                unitQuery = {
                    "unit._id": new ObjectId(query.unitId)
                }
            }

            // Tgl Po External
            var dates = {
                $divide: [{
                    $subtract: [{
                        $subtract: [{ "$add": ["$items.purchaseOrderExternal._createdDate", 60 * offset * 60 * 1000] },
                        {
                            "$add": [
                                { "$millisecond": "$items.purchaseOrderExternal._createdDate" },
                                {
                                    "$multiply": [
                                        { "$second": "$items.purchaseOrderExternal._createdDate" },
                                        1000
                                    ]
                                },
                                {
                                    "$multiply": [
                                        { "$minute": "$items.purchaseOrderExternal._createdDate" },
                                        60, 1000
                                    ]
                                },
                                {
                                    "$multiply": [
                                        { "$hour": { "$add": ["$items.purchaseOrderExternal._createdDate", 60 * offset * 60 * 1000] } },
                                        60, 60, 1000
                                    ]
                                }
                            ]
                        }
                        ]
                    }, {
                        $subtract: [
                            { "$add": ["$_createdDate", 60 * offset * 60 * 1000] },
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
                                            { "$hour": { "$add": ["$_createdDate", 60 * offset * 60 * 1000] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }]
                    }]
                }, 86400000]
            };
            var durationQuery = {};
            if (query.duration === "0-7 hari") {
                durationQuery = {
                    $cond: {
                        if: { $lt: [dates, 8] },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "8-14 hari") {
                durationQuery = {
                    $cond: {
                        if: {
                            "$and": [
                                { $gte: [dates, 8] },
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

            var Query = { "$and": [date, deletedQuery, postedQuery, closedQuery, unitQuery, userQuery] };

            this.collection.aggregate([
                { $unwind: "$items" },
                { $match: Query },
                { $redact: durationQuery },
                {
                    $project: {
                        "poIntNo": "$refNo",
                        "roNo": "$roNo",
                        "planPO": "$items.refNo",
                        "artikelNo": "$artikel",
                        "buyerName": "$buyer.name", 
                        "unit": "$unit.name",
                        "category": "$items.category.name",
                        "productCode": "$items.product.code",
                        "productName": "$items.remark",
                        "productQuantity": "$items.dealQuantity",
                        "productUom": "$items.dealUom.unit",
                        "productPrice": "$items.pricePerDealUnit",
                        "supplierCode": "$items.supplier.code",
                        "supplierName": "$items.supplier.name",
                        "poIntDate": "$date",
                        "poIntCreatedDate": "$_createdDate",
                        "poEksCreatedDate": "$items.purchaseOrderExternal._createdDate",
                        "expectedDate": "$items.purchaseOrderExternal.expectedDeliveryDate",
                        "poEksNo": "$items.purchaseOrderExternal.no",
                        "dateDiff": dates,
                        "staff": "$items.purchaseOrderExternal._createdBy"
                    }
                },
                { $sort: { "dateDiff": -1 } }
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
    }

    getXlsDurationPOIntPOExt(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";
        var offset = query.offset;
        for (var report of result.info) {
            var dateDiff = Math.ceil(report.dateDiff);
            index++;
            var item = {};
            item["No"] = index;
            item["No PO Internal"] = report.poIntNo;
            item["No RO"] = report.roNo;
            item["Plan PO"] = report.planPO;
            item["Article / Style"] = report.artikelNo;
            item["Nama Buyer"] = report.buyerName;
            item["Unit"] = report.unit;
            item["Kategori"] = report.category;
            item["Kode Barang"] = report.productCode;
            item["Nama Barang"] = report.productName;
            item["Jumlah Barang"] = report.productQuantity;
            item["Satuan Barang"] = report.productUom;
            item["Harga Barang"] = report.productPrice;
            item["Kode Supplier"] = report.supplierCode;
            item["Nama Supplier"] = report.supplierName;
            item["Tanggal PO Internal"] = moment(new Date(report.poIntCreatedDate)).add(7, 'h').format(dateFormat);
            item["Tanggal PO Eksternal"] = moment(new Date(report.poEksCreatedDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Target Datang"] = moment(new Date(report.expectedDate)).add(7, 'h').format(dateFormat);
            item["No PO Eksternal"] = report.poEksNo;
            item["Selisih Tanggal PO Internal - PO Eksternal (hari)"] = dateDiff;
            item["Nama Staff Pembelian"] = report.staff;

            xls.data.push(item);
        }

        xls.options = {
            "No": "number",
            "No Po Internal": "string",
            "No RO": "string",
            "Plan PO": "string",
            "Article / Style": "string",
            "Nama Buyer": "string",
            "Unit": "string",
            "Kategori": "string",
            "Kode Barang": "string",
            "Nama Barang": "string",
            "Jumlah Barang": "number",
            "Satuan Barang": "string",
            "Harga Barang": "number",
            "Kode Supplier": "string",
            "Nama Supplier": "string",
            "Tanggal PO Internal": "string",
            "Tanggal PO Eksternal": "string",
            "Tanggal Target Datang": "string",
            "No PO Eksternal": "string",
            "Selisih Tanggal PO Internal - PO Eksternal (hari)": "number",
            "Nama Staff Pembelian": "string"
        };

        if (query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PO INTERNAL - PO EKSTERNAL GARMENT ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PO INTERNAL - PO EKSTERNAL GARMENT ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `LAPORAN DURASI PO INTERNAL - PO EKSTERNAL GARMENT ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `LAPORAN DURASI PO INTERNAL - PO EKSTERNAL GARMENT.xlsx`;

        return Promise.resolve(xls);
    }     
getDurationPoExtDo(query) {
        return new Promise((resolve, reject) => {
            var deletedQuery = {
                "items.purchaseOrderExternal._deleted": false
            };
            var postedQuery = {
                "items.purchaseOrderExternal.isPosted": false
            };
            var closedQuery = {
                "items.purchaseOrderExternal.isClosed": false
            };
            // Tgl Po Eksternal
            var date = {
                "items.purchaseOrderExternal._createdDate": {
                    "$gte": (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                    "$lte": (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                }
            };
            var offset = query.offset;
            
            var userQuery = {};
            if (query.user && query.user != "") {
                userQuery = { 
                    "_createdBy": query.user 
                }
            }

            var unitQuery = {};
            if (query.unitId && query.unitId != "") {
                unitQuery = {
                    "unit._id": new ObjectId(query.unitId)
                }
            }

            var supplierQuery = {};
            if (query.supplierId && query.supplierId != ""){
                supplierQuery = {
                    "items.supplier._id": new ObjectId(query.supplierId)
                }
            }

            // Tgl Po External
            var dates = {
                $divide: [{
                    $subtract: [{
                        $subtract: [{ "$add": ["$items.fulfillments.supplierDoDate", 60 * offset * 60 * 1000] },
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
                                        { "$hour": { "$add": ["$items.fulfillments.supplierDoDate", 60 * offset * 60 * 1000] } },
                                        60, 60, 1000
                                    ]
                                }
                            ]
                        }
                        ]
                    }, {
                        $subtract: [
                            { "$add": ["$items.purchaseOrderExternal._createdDate" , 60 * offset * 60 * 1000] },
                            {
                                "$add": [
                                    { "$millisecond": "$items.purchaseOrderExternal._createdDate" },
                                    {
                                        "$multiply": [
                                            { "$second": "$items.purchaseOrderExternal._createdDate" },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": "$items.purchaseOrderExternal._createdDate" },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": ["$items.purchaseOrderExternal._createdDate", 60 * offset * 60 * 1000] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }]
                    }]
                }, 86400000]
            };
            var durationQuery = {};
           if (query.duration === "0-30 hari") {
                durationQuery = {
                    $cond: {
                        if: { $lt: [dates, 31] },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "31-60 hari") {
                durationQuery = {
                    $cond: {
                        if: {
                            "$and": [
                                { $gte: [dates, 31] },
                                { $lte: [dates, 60] }
                            ]
                        },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "> 60 hari") {
                durationQuery = {
                    $cond: {
                        if: { $gt: [dates, 60] },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }

            var Query = { "$and": [date, deletedQuery, unitQuery, supplierQuery, userQuery] };
            this.collection.aggregate([
                { $unwind: "$items" },
                { $unwind: "$items.fulfillments"},
                { $match: Query },
                { $redact: durationQuery },
                {
                    $project: {
                        "poIntNo": "$refNo",
                        "roNo": "$roNo",
                        "planPO": "$items.refNo",
                        "artikelNo": "$artikel",
                        "buyerName": "$buyer.name", 
                        "unit": "$unit.name",
                        "category": "$items.category.name",
                        "productCode": "$items.product.code",
                        "productName": "$items.remark",
                        "productQuantity": "$items.dealQuantity",
                        "productUom": "$items.dealUom.unit",
                        "productPrice": "$items.pricePerDealUnit",
                        "supplierCode": "$items.supplier.code",
                        "supplierName": "$items.supplier.name",
                        "poIntDate": "$date",
                        "poIntCreatedDate": "$_createdDate",
                        "poEksCreatedDate": "$items.purchaseOrderExternal._createdDate",
                        "expectedDate": "$items.purchaseOrderExternal.expectedDeliveryDate",
                        "poEksNo": "$items.purchaseOrderExternal.no",
                        "deliveryOrderNo": "$items.fulfillments.deliveryOrderNo",
                        "supplierDoDate": "$items.fulfillments.supplierDoDate",
                        "dateDiff": dates,
                        "staff": "$items.purchaseOrderExternal._createdBy"
                    }
                },
                { $sort: {"items.purchaseOrderExternal._createdDate": -1}}
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
    }

    getXlsDurationPoExtDo(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";
        var offset = query.offset;
        for (var report of result.data) {
            var dateDiff = Math.ceil(report.dateDiff);
            index++;
            var item = {};
            item["No"] = index;
            item["No PO Internal"] = report.poIntNo;
            item["No RO"] = report.roNo;
            item["Plan PO"] = report.planPO;
            item["Article / Style"] = report.artikelNo;
            item["Nama Buyer"] = report.buyerName;
            item["Unit"] = report.unit;
            item["Kategori"] = report.category;
            item["Kode Barang"] = report.productCode;
            item["Nama Barang"] = report.productName;
            item["Jumlah Barang"] = report.productQuantity;
            item["Satuan Barang"] = report.productUom;
            item["Harga Barang"] = report.productPrice;
            item["Kode Supplier"] = report.supplierCode;
            item["Nama Supplier"] = report.supplierName;
            item["Tanggal PO Internal"] = moment(new Date(report.poIntCreatedDate)).add(7, 'h').format(dateFormat);
            item["Tanggal PO Eksternal"] = moment(new Date(report.poEksCreatedDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Target Datang"] = moment(new Date(report.expectedDate)).add(7, 'h').format(dateFormat);
            item["No PO Eksternal"] = report.poEksNo;
            item["No Surat Jalan"] = report.deliveryOrderNo;
            item["Tanggal Surat Jalan"] = moment(new Date(report.supplierDoDate)).add(7, 'h').format(dateFormat);
            item["Selisih Tanggal PO Eksternal - Surat Jalan  (hari)"] = dateDiff;
            item["Nama Staff Pembelian"] = report.staff;

            xls.data.push(item);
        }

        xls.options = {
            "No": "number",
            "No Po Internal": "string",
            "No RO": "string",
            "Plan PO": "string",
            "Article / Style": "string",
            "Nama Buyer": "string",
            "Unit": "string",
            "Kategori": "string",
            "Kode Barang": "string",
            "Nama Barang": "string",
            "Jumlah Barang": "number",
            "Satuan Barang": "string",
            "Harga Barang": "number",
            "Kode Supplier": "string",
            "Nama Supplier": "string",
            "Tanggal PO Internal": "string",
            "Tanggal PO Eksternal": "string",
            "Tanggal Target Datang": "string",
            "No PO Eksternal": "string",
            "No Surat Jalan": "string",
            "Tanggal Surat Jalan": "string",
            "Selisih Tanggal PO Eksternal - Surat Jalan (hari)": "number",
            "Nama Staff Pembelian": "string"
        };

        if (query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PO EKSTERNAL - SURAT JALAN  GARMENT ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PO EKSTERNAL - SURAT JALAN GARMENT ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `LAPORAN DURASI PO EKSTERNAL - SURAT JALAN GARMENT ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `LAPORAN DURASI PO EKSTERNAL - SURAT JALAN GARMENT.xlsx`;

        return Promise.resolve(xls);
    }    
};
