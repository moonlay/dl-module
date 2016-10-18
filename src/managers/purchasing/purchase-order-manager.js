'use strict'

var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var PurchaseOrder = DLModels.purchasing.PurchaseOrder;
var generateCode = require('../../utils/code-generator');
var BaseManager = require('../base-manager');
var i18n = require('dl-i18n');

module.exports = class PurchaseOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.moduleId = 'PO';
        this.year = (new Date()).getFullYear().toString().substring(2, 4);
        this.collection = this.db.use(map.purchasing.collection.PurchaseOrder);
    }

    _validate(purchaseOrder) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = purchaseOrder;

            var getPurchaseOrderPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    },
                    _deleted:true
                }, {
                        "purchaseRequest.no": valid.purchaseRequest.no
                    }]
            });

            Promise.all([getPurchaseOrderPromise])
                .then(results => {
                    var _module = results[0];
                    var now = new Date();

                    if (valid.purchaseRequest) {
                        var itemError = {};
                        if (!valid.purchaseRequest.unit)
                            itemError["unit"] = i18n.__("PurchaseOrder.unit.isRequired:%s is required", i18n.__("PurchaseOrder.unit._:Unit")); //"Nama unit yang mengajukan tidak boleh kosong";

                        if (!valid.purchaseRequest.category)
                            itemError["category"] = i18n.__("PurchaseOrder.category.isRequired:%s is required", i18n.__("PurchaseOrder.category._:Category")); //"Kategori tidak boleh kosong";

                        if (!valid.purchaseRequest.no)
                            itemError["no"] = i18n.__("PurchaseOrder.purchaseRequest.no.isRequired:%s is required", i18n.__("PurchaseOrder.purchaseRequest.no._:No")); //"No. PR tidak boleh kosong";
                        else if (_module && _module.sourcePurchaseOrder == null && valid.sourcePurchaseOrder == null)
                            itemError["no"] = i18n.__("PurchaseOrder.purchaseRequest.no.isExists:%s is already exists", i18n.__("PurchaseOrder.purchaseRequest.no.._:No")); //"No. PR sudah terdaftar";
                        //pending
                        // if (!valid.purchaseRequest.date)
                        //     itemError["date"] = "Tanggal PR tidak boleh kosong";
                        // else {
                        //     var _prDate = new Date(valid.purchaseRequest.date);
                        //     if (_prDate > now)
                        //         itemError["date"] = "Tanggal PR tidak boleh lebih besar dari tanggal hari ini";
                        // }

                        // if (valid.purchaseRequest.expectedDeliveryDate && valid.purchaseRequest.date) {
                        //     var _prDate = new Date(valid.purchaseRequest.date);
                        //     var _expectedDate = new Date(valid.purchaseRequest.expectedDeliveryDate);
                        //     if (_prDate > _expectedDate)
                        //         itemError["expectedDeliveryDate"] = "Tanggal PR tidak boleh lebih besar dari tanggal tersedia";
                        // }

                        for (var prop in itemError) {
                            errors["purchaseRequest"] = itemError;
                            break;
                        }
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
                                    item.product._id=new ObjectId(item.product._id);
                                    if (item.product._id && item.defaultQuantity) {
                                        if (item.product._id.equals(sourcePoItem.product._id)) {
                                            if (item.defaultQuantity > sourcePoItem.defaultQuantity) {
                                                itemError["defaultQuantity"] = i18n.__("PurchaseOrder.items.defaultQuantity.isGreater:%s is greater than the first PO", i18n.__("PurchaseOrder.items.defaultQuantity._:DefaultQuantity")); //"Jumlah default tidak boleh lebih besar dari PO asal";
                                                break;
                                            }
                                            // else if (item.defaultQuantity == sourcePoItem.defaultQuantity) {
                                            //     itemError["defaultQuantity"] = "Jumlah default tidak boleh sama dengan PO asal";
                                            //     break;
                                            // }
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

                    if (valid.purchaseRequest) {
                        valid.refNo = valid.purchaseRequest.no;
                        valid.unit = valid.purchaseRequest.unit;
                        valid.unitId = new ObjectId(valid.purchaseRequest.unit._id);
                        valid.unit._id = new ObjectId(valid.purchaseRequest.unit._id);
                        valid.category = valid.purchaseRequest.category;
                        valid.categoryId = new ObjectId(valid.purchaseRequest.category._id);
                        valid.category._id = new ObjectId(valid.purchaseRequest.category._id);
                        valid.date = valid.purchaseRequest.date;
                        valid.expectedDeliveryDate = valid.purchaseRequest.expectedDeliveryDate;
                        for (var poItem of valid.items)
                        {
                            poItem.product._id = new ObjectId(poItem.product.uom._id);
                            poItem.product.uom._id = new ObjectId(poItem.product.uom._id);
                            poItem.defaultUom._id = new ObjectId(poItem.product.uom._id);
                        }
                    }
                    
                        valid.unitId = new ObjectId(valid.unitId);
                        valid.categoryId = new ObjectId(valid.categoryId);
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
            _deleted: false,
            _createdBy:this.user.username
        }, keywordFilter = {};

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
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    _createIndexes(){
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
        purchaseOrder = new PurchaseOrder(purchaseOrder);

        return new Promise((resolve, reject) => {
            purchaseOrder.no = `${this.moduleId}${this.year}${generateCode()}`;
            this._validate(purchaseOrder)
                .then(validPurchaseOrderc => {
                    this.collection.insert(validPurchaseOrderc)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                })

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
                                    this.getSingleById(validPurchaseOrder.sourcePurchaseOrderId)
                                        .then(sourcePo => {
                                            for (var item of validPurchaseOrder.items) {
                                                for (var sourceItem of sourcePo.items) {
                                                    if (item.product.code == sourceItem.product.code) {
                                                        sourceItem.defaultQuantity = sourceItem.defaultQuantity - item.defaultQuantity
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
                "purchaseRequest.date": 1,
                "purchaseRequest.no": 1
            };
            var query;
            if (unitId != "undefined" && unitId != "" && categoryId != "undefined" && categoryId != "" && PODLNo != "undefined" && PODLNo != "" && PRNo != "undefined" && PRNo != "" && supplierId != "undefined" && supplierId != "" && dateFrom != "undefined" && dateFrom != "" && dateTo != "undefined" && dateTo != "") {
                query = {
                    unitId: new ObjectId(unitId),
                    categoryId: new ObjectId(categoryId),
                    "purchaseOrderExternal.no": PODLNo,
                    "purchaseRequest.no": PRNo,
                    supplierId: new ObjectId(supplierId),
                    date:
                    {
                        $gte: dateFrom,
                        $lte: dateTo
                    },
                    _deleted: false
                };
            } else if (unitId != "undefined" && unitId != "" && categoryId != "undefined" && categoryId != "" && PODLNo != "undefined" && PODLNo != "" && PRNo != "undefined" && PRNo != "" && supplierId != "undefined" && supplierId != "") {
                query = {
                    unitId: new ObjectId(unitId),
                    categoryId: new ObjectId(categoryId),
                    "purchaseOrderExternal.no": PODLNo,
                    "purchaseRequest.no": PRNo,
                    supplierId: new ObjectId(supplierId),
                    _deleted: false
                };
            } else if (unitId != "undefined" && unitId != "" && categoryId != "undefined" && categoryId != "" && PODLNo != "undefined" && PODLNo != "" && PRNo != "undefined" && PRNo != "") {
                query = {
                    unitId: new ObjectId(unitId),
                    categoryId: new ObjectId(categoryId),
                    "purchaseOrderExternal.no": PODLNo,
                    "purchaseRequest.no": PRNo,
                    _deleted: false
                };
            } else if (unitId != "undefined" && unitId != "" && categoryId != "undefined" && categoryId != "" && PODLNo != "undefined") {
                query = {
                    unitId: new ObjectId(unitId),
                    categoryId: new ObjectId(categoryId),
                    "purchaseOrderExternal.no": PODLNo,
                    _deleted: false
                };
            } else if (unitId != "undefined" && unitId != "" && categoryId != "undefined" && categoryId != "") {
                query = {
                    unitId: new ObjectId(unitId),
                    categoryId: new ObjectId(categoryId),
                    _deleted: false
                };
            } else
                if (unitId != "undefined" && unitId != "") {
                    query = {
                        unitId: new ObjectId(unitId),
                        _deleted: false
                    };
                }
                else if (categoryId != "undefined" && categoryId != "") {
                    query = {
                        categoryId: new ObjectId(categoryId),
                        _deleted: false
                    };
                } else if (PODLNo != "undefined" && PODLNo != "") {
                    query = {
                        "purchaseOrderExternal.no": PODLNo,
                        _deleted: false
                    };
                } else if (PRNo != "undefined" && PRNo != "") {
                    query = {
                        "purchaseRequest.no": PRNo,
                        _deleted: false
                    };
                } else if (supplierId != "undefined" && supplierId != "") {
                    query = {
                        supplierId: new ObjectId(supplierId),
                        _deleted: false
                    };
                } else if (dateFrom != "undefined" && dateFrom != "" && dateTo != "undefined" && dateTo != "") {
                    query = {
                        date:
                        {
                            $gte: dateFrom,
                            $lte: dateTo
                        },
                        _deleted: false
                    };
                }
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
            if (startdate != "undefined" && enddate != "undefined" && startdate != "" && enddate != "") {

                this.collection.aggregate(
                    [{
                        $match: {
                            $and: [
                                {
                                    $and: [
                                        {
                                            "date": {
                                                $gte: startdate,
                                                $lte: enddate
                                            }
                                        },
                                        {
                                            "_deleted": false
                                        }

                                    ]
                                },
                                {
                                    "isPosted": true
                                }
                            ]

                        }
                    },
                        {
                            $unwind: "$items"
                        },
                        {
                            $group: {
                                _id: "$unit.division",
                                "pricetotal": { $sum: { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"] } }
                            }
                        }
                    ]
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

                            $and: [
                                {
                                    "isPosted": true
                                },
                                {
                                    "_deleted": false
                                }
                            ]
                        },
                    },
                        {
                            $unwind: "$items"
                        },
                        {
                            $group: {
                                _id: "$unit.division",
                                "pricetotal": { $sum: { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"] } }
                            }
                        }
                    ]
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
            if (startdate != "undefined" && enddate != "undefined" && startdate != "" && enddate != "") {

                this.collection.aggregate(
                    [{
                        $match: {
                            $and: [{
                                $and: [
                                    {
                                        $and: [
                                            {
                                                "date": {
                                                    $gte: startdate,
                                                    $lte: enddate
                                                }
                                            },
                                            {
                                                "_deleted": false
                                            }
                                        ]
                                    },
                                    {
                                        "isPosted": true
                                    }
                                ]
                            },
                                {
                                    "unit.division": unit
                                }
                            ]
                        }
                    },
                        {
                            $unwind: "$items"
                        },
                        {
                            $group: {
                                _id: "$unit.subDivision",
                                "pricetotal": { $sum: { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"] } }
                            }
                        }
                    ]
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
                            $and: [
                                {
                                    $and: [
                                        {
                                            "isPosted": true
                                        },
                                        {
                                            "_deleted": false
                                        }
                                    ]
                                },
                                {
                                    "unit.division": unit
                                }
                            ]
                        }
                    },
                        {
                            $unwind: "$items"
                        },
                        {
                            $group: {
                                _id: "$unit.subDivision",
                                "pricetotal": { $sum: { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"] } }
                            }
                        }
                    ]
                )
                    .toArray(function (err, result) {
                        assert.equal(err, null);
                        resolve(result);
                    });

            }
        });
    }

    getDataPOCategory(startdate, enddate) {
        return new Promise((resolve, reject) => {
            if (startdate != "undefined" && enddate != "undefined" && startdate != "" && enddate != "") {
                this.collection.aggregate(
                    [{
                        $match: {
                            $and: [
                                {
                                    $and: [
                                        {
                                            "date": {
                                                $gte: startdate,
                                                $lte: enddate
                                            }
                                        },
                                        {
                                            "_deleted": false
                                        }

                                    ]
                                },
                                {
                                    "isPosted": true
                                }
                            ]

                        }
                    },
                        {
                            $unwind: "$items"
                        },
                        {
                            $group: {
                                _id: "$category.name",
                                "pricetotal": { $sum: { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"] } }
                            }
                        }
                    ]
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

                            $and: [
                                {
                                    "isPosted": true
                                },
                                {
                                    "_deleted": false
                                }
                            ]
                        }
                    },
                        {
                            $unwind: "$items"
                        },
                        {
                            $group: {
                                _id: "$category.name",
                                "pricetotal": { $sum: { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$currencyRate"] } }
                            }
                        }
                    ]
                )
                    .toArray(function (err, result) {
                        assert.equal(err, null);
                        resolve(result);
                    });

            }
        });
    }
}