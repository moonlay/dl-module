'use strict'

var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var PurchaseOrder = DLModels.purchasing.PurchaseOrder;
var generateCode = require('../../utils/code-generator');
var BaseManager = require('../base-manager');

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
                    }
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
                            itemError["unit"] = "Nama unit yang mengajukan tidak boleh kosong";

                        if (!valid.purchaseRequest.category)
                            itemError["category"] = "Kategori tidak boleh kosong";

                        if (!valid.purchaseRequest.no)
                            itemError["no"] = "No. PR tidak boleh kosong";
                        else if (_module && _module.sourcePurchaseOrder == null && valid.sourcePurchaseOrder == null)
                            itemError["no"] = "No. PR sudah terdaftar";
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
                                itemError["product"] = "Nama barang tidak boleh kosong";
                            if (!item.defaultQuantity || item.defaultQuantity == 0)
                                itemError["defaultQuantity"] = "Jumlah default tidak boleh kosong";

                            if (valid.sourcePurchaseOrder != null) {
                                for (var sourcePoItem of valid.sourcePurchaseOrder.items) {
                                    if (item.product._id && item.defaultQuantity) {
                                        if (item.product._id.equal(sourcePoItem.product._id)) {
                                            if (item.defaultQuantity > sourcePoItem.defaultQuantity) {
                                                itemError["defaultQuantity"] = "Jumlah default tidak boleh lebih besar dari PO asal";
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
                        errors["items"] = "Harus ada minimal 1 barang";
                    }

                     if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }
                    
                    if (valid.purchaseRequest) {
                        valid.refNo = valid.purchaseRequest.no;
                        valid.unit = valid.purchaseRequest.unit;
                        valid.unitId = new ObjectId(valid.purchaseRequest.unit._id);
                        valid.category = valid.purchaseRequest.category;
                        valid.categoryId = new ObjectId(valid.purchaseRequest.category._id);
                        valid.date = valid.purchaseRequest.date;
                        valid.expectedDeliveryDate = valid.purchaseRequest.expectedDeliveryDate;
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
        var filter = {
            _deleted: false
        };

        var query = paging.keyword ? {
            '$and': [filter]
        } : filter;

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

            var $or = {
                '$or': [filterRefPONo,filterRefPOEksternal, filterPONo,filterUnitDivision,filterUnitSubDivision,filterCategory, filterBuyerName]
            };

            query['$and'].push($or);
        }
        return query;
    }

    read(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: 'date',
            asc: true
        }, paging);
        
        var sorting={
                "unit.division": 1, 
                "category.name": 1,
                "purchaseRequest.date": 1
            };
            
        return new Promise((resolve, reject) => {
            var query = this._getQuery(_paging);
            this.collection.find(query).sort(sorting).toArray()
                .then(modules => {
                    resolve(modules);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _getQueryUnposted(_paging) {
        var filter = {
            _deleted: false,
            isPosted: false
        };

        var query = _paging.keyword ? {
            '$and': [filter]
        } : filter;

        if (_paging.keyword) {
            var regex = new RegExp(_paging.keyword, "i");

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

            var $or = {
                '$or': [filterRefPONo,filterRefPOEksternal, filterPONo,filterUnitDivision,filterUnitSubDivision,filterCategory, filterBuyerName]
            };

            query['$and'].push($or);
        }

        return query;
    }

    readUnposted(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);

        return new Promise((resolve, reject) => {

            var query = this._getQueryUnposted(_paging);

            this.collection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(PurchaseOrders => {
                    resolve(PurchaseOrders);
                })
                .catch(e => {
                    reject(e);
                });
        });
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
            var sorting={
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
                            $and :[{
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
                                    "unit.division":unit
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
                            $and :[
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
                                    "unit.division":unit
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

    getDataPOCategory(startdate,enddate){
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
                                        $gte: startdate , 
                                        $lte: enddate   }
                                    },
                                    {
                                        "_deleted":false
                                    }                         
                                    
                                    ]
                                },
                                {
                                    "isPosted":true
                                } 
                            ]
                            
                        }
                    },
                    {
                        $unwind: "$items"
                    },
                    {
                        $group:{
                            _id: "$category.name" ,
                            "pricetotal":{$sum:{$multiply:["$items.pricePerDealUnit","$items.dealQuantity","$currencyRate"]}}
                        }
                    }
                ]
                )
                .toArray(function(err, result) {
                    assert.equal(err, null);
                    resolve(result);
                }); 
                
             }
             else{
                 this.collection.aggregate(
                       [{
                            $match: {
                                       
                                $and: [ 
                                        {
                                            "isPosted":true
                                        } ,
                                        {
                                            "_deleted":false
                                        }      
                                    ]
                                }  
                            },
                            {
                                $unwind: "$items"
                            },
                            {
                                $group:{
                                    _id: "$category.name" ,
                                    "pricetotal":{$sum:{$multiply:["$items.pricePerDealUnit","$items.dealQuantity","$currencyRate"]}}
                                }
                            }
                        ]
                        )
                    .toArray(function(err, result) {
                        assert.equal(err, null);
                        resolve(result);
                    }); 
                
             }      
         });
    }
}