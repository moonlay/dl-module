'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var PurchaseOrderExternal = DLModels.purchasing.PurchaseOrderExternal;
var PurchaseOrderManager = require('./purchase-order-manager');
var BaseManager = require('../base-manager');
var generateCode = require('../../utils/code-generator');

module.exports = class PurchaseOrderExternalManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.PurchaseOrderExternal);
        this.year = (new Date()).getFullYear().toString().substring(2, 4);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
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

            var filterPODLNo = {
                'no': {
                    '$regex': regex
                }
            };
            var filterRefPO = {
                'refNo': {
                    '$regex': regex
                }
            };
            var filterPOItem = {
                items: {
                    $elemMatch: {
                        no: {
                            '$regex': regex
                        }
                    }
                }
            };
            var filterSupplierName = {
                'supplier.name': {
                    '$regex': regex
                }
            };

            var $or = {
                '$or': [filterPODLNo, filterRefPO, filterPOItem, filterSupplierName]
            };

            query['$and'].push($or);
        }
        return query;
    }

    create(purchaseOrderExternal) {
        return new Promise((resolve, reject) => {
            this._validate(purchaseOrderExternal)
                .then(validPurchaseOrderExternal => {
                    validPurchaseOrderExternal.no = this.generatePOno();
                    validPurchaseOrderExternal.supplierId=new ObjectId(validPurchaseOrderExternal.supplierId);
                    this.collection.insert(validPurchaseOrderExternal)
                        .then(id => {
                            var tasks = [];
                            var getPOItemById = [];
                            for (var data of validPurchaseOrderExternal.items) {
                                getPOItemById.push(this.purchaseOrderManager.getSingleById(data._id));
                            }
                            Promise.all(getPOItemById)
                                .then(results => {
                                    for (var result of results) {
                                        var poItem = result;
                                        poItem.isPosted = true;
                                        tasks.push(this.purchaseOrderManager.update(poItem));
                                    }
                                    Promise.all(tasks)
                                        .then(results => {
                                            resolve(id);
                                        })
                                        .catch(e => {
                                            reject(e);
                                        })
                                })
                                .catch(e => {
                                    reject(e);
                                })
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    _validate(purchaseOrderGroup) {
        var purchaseOrderExternalError = {};
        return new Promise((resolve, reject) => {
            var valid = purchaseOrderGroup;
            
            var getPurchaseOrderPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        "refNo": valid.refNo
                    }]
            });
            
            Promise.all([getPurchaseOrderPromise])
                .then(results => {
                    var _module = results[0];
                    var now = new Date();
                    
                    if(valid.refNo != '' && _module)
                        purchaseOrderExternalError["refNo"] = "No. Ref Surat Jalan sudah terdaftar";
                        
                    if (!valid.supplierId || valid.supplierId.toString() == '')
                        purchaseOrderExternalError["supplierId"] = "Nama Supplier tidak boleh kosong";

                    if (!valid.expectedDeliveryDate || valid.expectedDeliveryDate == '')
                        purchaseOrderExternalError["expectedDeliveryDate"] = "Tanggal tersedia tidak boleh kosong";

                    if (!valid.date || valid.date == '')
                        purchaseOrderExternalError["date"] = "Tanggal tidak boleh kosong";

                    if (!valid.paymentMethod || valid.paymentMethod == '')
                        purchaseOrderExternalError["paymentMethod"] = "Metode Pembayaran tidak boleh kosong";

                    if (!valid.currencyRate || valid.currencyRate == 0)
                        purchaseOrderExternalError["currencyRate"] = "Rate tidak boleh kosong";

                    if (valid.paymentMethod.toUpperCase() != "CASH")
                        if(!valid.paymentDueDays || valid.paymentDueDays == ''|| valid.paymentDueDays == 0)
                            purchaseOrderExternalError["paymentDueDays"] = "Tempo Pembayaran tidak boleh kosong";
                            
                    // if ((valid.paymentMethod.toUpperCase() != "CASH") && !valid.paymentDueDays || valid.paymentDueDays == '')
                    //     purchaseOrderExternalError["paymentDueDays"] = "Tempo Pembayaran tidak boleh kosong";

                    // if (valid.useVat == undefined || valid.useVat.toString() === '')
                    //     purchaseOrderExternalError["useVat"] = "Pengenaan PPn harus dipilih";

                    // if (valid.useIncomeTax == undefined || valid.useIncomeTax.toString() === '')
                    //     purchaseOrderExternalError["useIncomeTax"] = "Pengenaan PPh harus dipilih";

                    if (valid.items && valid.items.length < 1)
                        purchaseOrderExternalError["items"] = "Harus ada minimal 1 po internal";
                    else {
                        var purchaseOrderExternalItemErrors = [];
                        var poItemExternalHasError = false;
                        for (var purchaseOrder of valid.items) {
                            var purchaseOrderError = {};
                            var purchaseOrderItemErrors = [];
                            var poItemHasError = false;

                            if (!purchaseOrder.no || purchaseOrder.no == "") {
                                poItemHasError = true;
                                purchaseOrderError["no"] = "Purchase order internal tidak boleh kosong";
                            }

                            for (var poItem of purchaseOrder.items || []) {
                                var poItemError = {};
                                if (!poItem.dealQuantity || poItem.dealQuantity == 0) {
                                    poItemHasError = true;
                                    poItemError["dealQuantity"] = "Jumlah kesepakatan tidak boleh kosong";
                                }
                                if (!poItem.dealUom || !poItem.dealUom.unit || poItem.dealUom.unit == "") {
                                    poItemHasError = true;
                                    poItemError["dealUom"] = "Jumlah kesepakatan tidak boleh kosong";
                                }
                                if (!poItem.pricePerDealUnit || poItem.pricePerDealUnit == 0) {
                                    poItemHasError = true;
                                    poItemError["pricePerDealUnit"] = "Harga tidak boleh kosong";
                                }

                                if (!poItem.conversion || poItem.conversion == '') {
                                    poItemHasError = true;
                                    poItemError["conversion"] = "Konversi tidak boleh kosong";
                                }

                                purchaseOrderItemErrors.push(poItemError);
                            }
                            if (poItemHasError) {
                                poItemExternalHasError = true;
                                purchaseOrderError["items"] = purchaseOrderItemErrors;
                            }

                            purchaseOrderExternalItemErrors.push(purchaseOrderError);
                        }
                        if (poItemExternalHasError)
                            purchaseOrderExternalError["items"] = purchaseOrderExternalItemErrors;
                    }


                    // 2c. begin: check if data has any error, reject if it has.
                     if (Object.getOwnPropertyNames(purchaseOrderExternalError).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data podl does not pass validation', purchaseOrderExternalError));
                    }

                    valid.supplierId=new ObjectId(valid.supplierId);
                    if (!valid.stamp)
                        valid = new PurchaseOrderExternal(valid);

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    post(listPurchaseOrderExternal) {
        var tasks = [];
        var getPOItemById = [];
        return new Promise((resolve, reject) => {
            for (var purchaseOrderExternal of listPurchaseOrderExternal) {

                purchaseOrderExternal.isPosted = true;
                tasks.push(this.update(purchaseOrderExternal));
                for (var data of purchaseOrderExternal.items) {
                    getPOItemById.push(this.purchaseOrderManager.getSingleById(data._id));
                }
            }
            Promise.all(getPOItemById)
                .then(results => {
                    for (var result of results) {
                        var _purchaseOrder = result;
                        for (var _purchaseOrderExternal of listPurchaseOrderExternal) {
                            for (var _poExternal of _purchaseOrderExternal.items) {
                                if (_purchaseOrder._id.equals(_poExternal._id)) {
                                    _purchaseOrder.purchaseOrderExternalId = new ObjectId(_purchaseOrderExternal._id);
                                    _purchaseOrder.purchaseOrderExternal = _purchaseOrderExternal;
                                    _purchaseOrder.supplierId = new ObjectId(_purchaseOrderExternal.supplierId);
                                    _purchaseOrder.supplier = _purchaseOrderExternal.supplier;
                                    _purchaseOrder.freightCostBy = _purchaseOrderExternal.freightCostBy;
                                    _purchaseOrder.currency = _purchaseOrderExternal.currency;
                                    _purchaseOrder.currencyRate = _purchaseOrderExternal.currencyRate;
                                    _purchaseOrder.paymentMethod = _purchaseOrderExternal.paymentMethod;
                                    _purchaseOrder.paymentDueDays = _purchaseOrderExternal.paymentDueDays;
                                    _purchaseOrder.useVat = _purchaseOrderExternal.useVat;
                                    _purchaseOrder.vatRate = _purchaseOrderExternal.vatRate;
                                    _purchaseOrder.useIncomeTax = _purchaseOrderExternal.useIncomeTax;
                                    _purchaseOrder.isPosted = true;

                                    for (var poItem of _purchaseOrder.items) {
                                        for (var itemExternal of _poExternal.items) {
                                            if (itemExternal.product._id.equals(poItem.product._id)) {
                                                poItem.dealQuantity = itemExternal.dealQuantity;
                                                poItem.dealUom = itemExternal.dealUom;
                                                poItem.pricePerDealUnit = itemExternal.pricePerDealUnit;
                                                poItem.conversion = itemExternal.conversion;
                                            }
                                        }
                                    }
                                    tasks.push(this.purchaseOrderManager.update(_purchaseOrder));
                                    break;
                                }
                            }
                        }
                    }

                    Promise.all(tasks)
                        .then(result => {
                            resolve(result);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    generatePOno() {
        var now = new Date();
        var stamp = now / 1000 | 0;
        var code = stamp.toString();
        var year = now.getFullYear();
        var month = now.getMonth();
        var initial = 'AS';
        var div = "UMUM";
        var unit = '';
        switch (div.toUpperCase().trim()) {
            case "UMUM":
                unit = 'PBL.A';
                break;
            case 'UTILITY':
                unit = 'PBL.C';
                break;
            case "FINISHING&PRINTING":
                unit = 'PBL.D';
                break;
            case 'WEAVING':
                unit = 'PBL.E';
                break;
            case "SPINNING":
                unit = 'PBL.F';
                break;
            default:
                unit = "PBL.X";
        }
        var no = `${code}/DL-${unit}/PO-${initial}/${month}/${year}`;
        return no;
    }

    _getQueryPosted( _paging) {
        var supplierId = _paging.filter.supplierId;
        
        var filter = {
            _deleted: false,
            isPosted: true,
            isClosed: false,
            supplierId: new ObjectId(supplierId)
        };

        var query = _paging.keyword ? {
            '$and': [filter]
        } : filter;

        if (_paging.keyword) {
            var regex = new RegExp(_paging.keyword, "i");

            var filterPOItem = {
                items: {
                    $elemMatch: {
                        no: {
                            '$regex': regex
                        }
                    }
                }
            };

            var filterPODLNo = {
                'no': {
                    '$regex': regex
                }
            };

            var filterRefPO = {
                "refNo": {
                    '$regex': regex
                }
            };
            var filterPOItem = {
                items: {
                    $elemMatch: {
                        no: {
                            '$regex': regex
                        }
                    }
                }
            };

            var $or = {
                '$or': [filterPODLNo, filterRefPO, filterPOItem]
            };

            query['$and'].push($or);
        }

        return query;
    }

   readPosted(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);

        return new Promise((resolve, reject) => {
            var query = this._getQueryPosted(_paging);

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
}
