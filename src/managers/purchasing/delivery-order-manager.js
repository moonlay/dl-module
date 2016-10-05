'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('../base-manager');

// internal deps 
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var DeliveryOrder = DLModels.purchasing.DeliveryOrder;
var PurchaseOrderManager = require('./purchase-order-manager');
var PurchaseOrderExternalManager = require('./purchase-order-external-manager');

// var PurchaseOrderBaseManager = require('../po/purchase-order-base-manager');
// var DOItem = DLModels.po.DOItem;

module.exports = class DeliveryOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.DeliveryOrder);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, user);
    }

    _getQuery(paging) {
        var deleted = {
            _deleted: false
        };
        var query = paging.keyword ? {
            '$and': [deleted]
        } : deleted;

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var filteNO = {
                'no': {
                    '$regex': regex
                }
            };
            var filterNRefNo = {
                'refNo': {
                    '$regex': regex
                }
            };
            var filterSupplierName = {
                'supplier.name': {
                    '$regex': regex
                }
            };
            var filterItem = {
                items: {
                    $elemMatch: {
                        'purchaseOrderExternal.no':{
                            '$regex': regex
                        }
                    }
                }
            };
            var $or = {
                '$or': [filteNO, filterNRefNo, filterSupplierName,filterItem]
            };

            query['$and'].push($or);
        }
        return query;
    }

    post(deliveryOrder) {
        return new Promise((resolve, reject) => {
            this._validate(deliveryOrder)
                .then(validDeliveryOrder => {
                    validDeliveryOrder.isPosted = true;
                    this.collection.update(validDeliveryOrder)
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
        });
    }

    _validate(deliveryOrder) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = deliveryOrder;
            var now = new Date();

            var getDeliveryderPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        "no": valid.no
                    }]
            });
            Promise.all([getDeliveryderPromise])
                .then(results => {
                    var _module = results[0];
                    if (!valid.no || valid.no == '')
                        errors["no"] = "Nomor surat jalan tidak boleh kosong";
                    else if (_module)
                        errors["no"] = "Nomor surat jalan sudah terdaftar";

                    if (!valid.date || valid.date == '')
                        errors["date"] = "Tanggal surat jalan tidak boleh kosong";
                    else if (valid.date > now)
                        errors["date"] = "Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                    if (!valid.supplierDoDate || valid.supplierDoDate == '')
                        errors["supplierDoDate"] = "Tanggal surat jalan supplier tidak boleh kosong";

                    if (!valid.supplierId || valid.supplierId.toString() == '')
                        errors["supplier"] = "Nama supplier tidak boleh kosong";

                    if (valid.items && valid.items.length < 1) {
                        errors["items"] = "Harus ada minimal 1 nomor po eksternal";
                    } else {
                        var deliveryOrderItemErrors = [];
                        var deliveryOrderItemHasError = false;
                        for (var doItem of valid.items || []) {
                            var purchaseOrderExternalItemErrors = [];
                            var purchaseOrderExternalItemHasErrors = false;
                            var purchaseOrderExternalError = {};

                            if (!doItem.purchaseOrderExternal) {
                                purchaseOrderExternalItemHasErrors = true;
                                purchaseOrderExternalError["purchaseOrderExternal"] = "Purchase order external tidak boleh kosong";
                            }

                            for (var doFulfillment of doItem.fulfillments || []) {
                                var fulfillmentError = {};
                                if (!doFulfillment.deliveredQuantity || doFulfillment.deliveredQuantity == 0) {
                                    purchaseOrderExternalItemHasErrors = true;
                                    fulfillmentError["deliveredQuantity"] = "Jumlah barang diterima tidak boleh kosong";
                                }
                                else if (doFulfillment.deliveredQuantity > doFulfillment.purchaseOrderQuantity) {
                                    purchaseOrderExternalItemHasErrors = true;
                                    fulfillmentError["deliveredQuantity"] = "Jumlah barang diterima tidak boleh lebih besar dari jumlah barang di po eksternal";
                                }
                                purchaseOrderExternalItemErrors.push(fulfillmentError);
                            }
                            if (purchaseOrderExternalItemHasErrors) {
                                deliveryOrderItemHasError = true;
                                purchaseOrderExternalError["fulfillments"] = purchaseOrderExternalItemErrors;
                            }
                            deliveryOrderItemErrors.push(purchaseOrderExternalError);
                        }
                        if (purchaseOrderExternalItemHasErrors)
                            errors["items"] = deliveryOrderItemErrors;
                    }

                    // 2c. begin: check if data has any error, reject if it has.
                     if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.supplierId=new ObjectId(valid.supplierId);
                    for(var item of valid.items)
                    {
                        item.purchaseOrderExternalId = new ObjectId(item.purchaseOrderExternalId);
                        for(var fulfillment of item.fulfillments)
                        {
                            fulfillment.purchaseOrderId=new ObjectId(fulfillment.purchaseOrderId);
                            fulfillment.productId=new ObjectId(fulfillment.productId);
                        }
                    }
                    if (!valid.stamp)
                        valid = new DeliveryOrder(valid);

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    create(deliveryOrder) {
        return new Promise((resolve, reject) => {
            var tasks = [];
            var tasksPoExternal = [];
            var getPurchaseOrderById=[];
            this._validate(deliveryOrder)
                .then(validDeliveryOrder => {
                    validDeliveryOrder.supplierId=new ObjectId(validDeliveryOrder.supplierId);
                    this.collection.insert(validDeliveryOrder)
                        .then(id => {
                            //update PO Internal
                            for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                for (var fulfillmentItem of validDeliveryOrderItem.fulfillments) {
                                    getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(fulfillmentItem.purchaseOrder._id));
                                }
                                    Promise.all(getPurchaseOrderById)
                                        .then(results => {
                                            for (var result of results) {
                                                var purchaseOrder = result;
                                                for (var poItem of purchaseOrder.items) {
                                                    var doItems = validDeliveryOrderItem.fulfillments;
                                                    for (var doItem of doItems) {
                                                        if (purchaseOrder._id == doItem.purchaseOrder._id && poItem.product._id == doItem.product._id) {

                                                            var fulfillmentObj = {
                                                                no: validDeliveryOrder.no,
                                                                deliveredQuantity: doItem.deliveredQuantity,
                                                                date:validDeliveryOrder.date,
                                                                supplierDoDate:validDeliveryOrder.supplierDoDate
                                                            };
                                                            poItem.fulfillments.push(fulfillmentObj);

                                                            var totalRealize = 0;
                                                            for (var poItemFulfillment of poItem.fulfillments) {
                                                                totalRealize += poItemFulfillment.deliveredQuantity;
                                                            }
                                                            poItem.realizationQuantity = totalRealize;
                                                            if(poItem.realizationQuantity == poItem.dealQuantity)
                                                                poItem.isClosed=true;
                                                            else
                                                                poItem.isClosed=false;
                                                            break;
                                                        }
                                                    }
                                                }
                                                for (var poItem of purchaseOrder.items) {
                                                    if (poItem.isClosed==true)
                                                        purchaseOrder.isClosed=true;
                                                    else
                                                    {
                                                        purchaseOrder.isClosed=false;
                                                        break;
                                                    }
                                                }
                                                tasks.push(this.purchaseOrderManager.update(purchaseOrder));
                                            }

                                            Promise.all(tasks)
                                                .then(results => {
                                                    //update PO Eksternal
                                                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                        var purchaseOrderExternal = validDeliveryOrderItem.purchaseOrderExternal;
                                                        var getPurchaseOrderById = [];
                                                        for (var purchaseOrderExternalItem of purchaseOrderExternal.items) {
                                                            // var indexPO = purchaseOrderExternal.items.indexOf(purchaseOrderExternalItem);
                                                            getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(purchaseOrderExternalItem._id));
                                                        }
                                                        Promise.all(getPurchaseOrderById)
                                                            .then(results => {
                                                                for(var result of results)
                                                                {
                                                                    if(result.isClosed == true)
                                                                        purchaseOrderExternal.isClosed=true;
                                                                    else{
                                                                        purchaseOrderExternal.isClosed=false;
                                                                        break;
                                                                    }
                                                                }
                                                                purchaseOrderExternal.items = results;
                                                                tasksPoExternal.push(this.purchaseOrderExternalManager.update(purchaseOrderExternal));
                                                            })
                                                            .catch(e => {
                                                                reject(e);
                                                            });

                                                    }

                                                    Promise.all(tasksPoExternal)
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
                                        });
                            }

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
    
    getDataDeliveryOrder(no, supplierId, dateFrom, dateTo) {
        return new Promise((resolve, reject) => {
            var query;
            if (no != "undefined" && no != "" && supplierId != "undefined" && supplierId != "" && dateFrom != "undefined" && dateFrom != "" && dateTo != "undefined" && dateTo != "") {
                query = {
                    no: no,
                    supplierId: new ObjectId(supplierId),
                    supplierDoDate:
                    {
                        $gte: dateFrom,
                        $lte: dateTo
                    },
                    _deleted: false
                };
            } else if (no != "undefined" && no != "" && supplierId != "undefined" && supplierId != "") {
                query = {
                    no: no,
                    supplierId: new ObjectId(supplierId),
                    _deleted: false
                };
            } else if (supplierId != "undefined" && supplierId != "") {
                query = {
                    supplierId: new ObjectId(supplierId),
                    _deleted: false
                };
            } else if (no != "undefined" && no != "") {
                query = {
                    no: no,
                    _deleted: false
                };
            } else if (dateFrom != "undefined" && dateFrom != "" && dateTo != "undefined" && dateTo != "") {
                query = {
                    supplierDoDate:
                    {
                        $gte: dateFrom,
                        $lte: dateTo
                    },
                    _deleted: false
                };
            }

            this.collection
                .where(query)
                .execute()
                .then(PurchaseOrder => {
                    resolve(PurchaseOrder);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
}