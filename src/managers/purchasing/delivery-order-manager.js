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
var i18n = require('dl-i18n');

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
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};


        var query = {};

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
                        'purchaseOrderExternal.no': {
                            '$regex': regex
                        }
                    }
                }
            };
            keywordFilter = {
                '$or': [filteNO, filterNRefNo, filterSupplierName, filterItem]
            };
        }

        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
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
                        errors["no"] = i18n.__("DeliveryOrder.no.isRequired:%s is required", i18n.__("DeliveryOrder.no._:No"));//"Nomor surat jalan tidak boleh kosong";
                    else if (_module)
                        errors["no"] = i18n.__("DeliveryOrder.no.isExists:%s is already exists", i18n.__("DeliveryOrder.no._:No"));//"Nomor surat jalan sudah terdaftar";

                    if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("DeliveryOrder.date.isRequired:%s is required", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh kosong";
                    else if (valid.date > now)
                        errors["date"] = i18n.__("DeliveryOrder.date.isGreater:%s is greater than today", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                    if (!valid.supplierDoDate || valid.supplierDoDate == '')
                        errors["supplierDoDate"] = i18n.__("DeliveryOrder.supplierDoDate.isRequired:%s is required", i18n.__("DeliveryOrder.supplierDoDate._:SupplierDoDate"));//"Tanggal surat jalan supplier tidak boleh kosong";

                    if (!valid.supplierId || valid.supplierId.toString() == '')
                        errors["supplier"] = i18n.__("DeliveryOrder.supplier.name.isRequired:%s is required", i18n.__("DeliveryOrder.supplier.name._:NameSupplier")); //"Nama supplier tidak boleh kosong";

                    if (valid.items && valid.items.length < 1) {
                        errors["items"] = i18n.__("DeliveryOrder.items.isRequired:%s is required", i18n.__("DeliveryOrder.items.name._:Items")); //"Harus ada minimal 1 nomor po eksternal";
                    } else {
                        var deliveryOrderItemErrors = [];
                        var deliveryOrderItemHasError = false;
                        for (var doItem of valid.items || []) {
                            var purchaseOrderExternalItemErrors = [];
                            var purchaseOrderExternalItemHasErrors = false;
                            var purchaseOrderExternalError = {};

                            if (!doItem.purchaseOrderExternal) {
                                purchaseOrderExternalItemHasErrors = true;
                                purchaseOrderExternalError["purchaseOrderExternal"] = i18n.__("DeliveryOrder.items.purchaseOrderExternal.isRequired:%s is required", i18n.__("DeliveryOrder.items.purchaseOrderExternal._:PurchaseOrderExternal")); //"Purchase order external tidak boleh kosong";
                            }

                            for (var doFulfillment of doItem.fulfillments || []) {
                                var fulfillmentError = {};
                                if (!doFulfillment.deliveredQuantity || doFulfillment.deliveredQuantity == 0) {
                                    purchaseOrderExternalItemHasErrors = true;
                                    fulfillmentError["deliveredQuantity"] = i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity.isRequired:%s is required or not 0", i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity._:DeliveredQuantity")); //"Jumlah barang diterima tidak boleh kosong";
                                }
                                else if (doFulfillment.deliveredQuantity > doFulfillment.purchaseOrderQuantity) {
                                    purchaseOrderExternalItemHasErrors = true;
                                    fulfillmentError["deliveredQuantity"] = i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity.isGreater:%s is greater than purchaseOrderQuantity", i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity._:DeliveredQuantity")); //"Jumlah barang diterima tidak boleh lebih besar dari jumlah barang di po eksternal";
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

                    valid.supplierId = new ObjectId(valid.supplier._id);
                    valid.supplier._id = new ObjectId(valid.supplier._id);
                    for (var item of valid.items) {
                        item.purchaseOrderExternalId = new ObjectId(item.purchaseOrderExternal._id);
                        item.purchaseOrderExternal._id = new ObjectId(item.purchaseOrderExternal._id);
                        item.purchaseOrderExternal.supplierId = new ObjectId(item.purchaseOrderExternal.supplier._id);
                        item.purchaseOrderExternal.supplier._id = new ObjectId(item.purchaseOrderExternal.supplier._id);
                        item.purchaseOrderExternal.currency._id = new ObjectId(item.purchaseOrderExternal.currency._id);
                        if (item.purchaseOrderExternal.vat) {
                            item.purchaseOrderExternal.vat._id = new ObjectId(item.purchaseOrderExternal.vat._id);
                        }
                        for (var exItem of item.purchaseOrderExternal.items) {
                            exItem.purchaseRequest.unit._id = new ObjectId(exItem.purchaseRequest.unit._id);
                            exItem.purchaseRequest.category._id = new ObjectId(exItem.purchaseRequest.category._id);
                            exItem.purchaseRequest.unitId = new ObjectId(exItem.purchaseRequest.unit._id);
                            exItem.purchaseRequest.categoryId = new ObjectId(exItem.purchaseRequest.category._id);
                            if (exItem.sourcePurchaseOrder) {
                                exItem.sourcePurchaseOrder._id = new ObjectId(exItem.sourcePurchaseOrder._id);
                                exItem.sourcePurchaseOrder.purchaseRequest.unit._id = new ObjectId(exItem.sourcePurchaseOrder.purchaseRequest.unit._id);
                                exItem.sourcePurchaseOrder.purchaseRequest.category._id = new ObjectId(exItem.sourcePurchaseOrder.purchaseRequest.category._id);
                                exItem.sourcePurchaseOrder.purchaseRequest.unitId = new ObjectId(exItem.sourcePurchaseOrder.purchaseRequest.unit._id);
                                exItem.sourcePurchaseOrder.purchaseRequest.categoryId = new ObjectId(exItem.sourcePurchaseOrder.purchaseRequest.category._id);
                                exItem.sourcePurchaseOrder.unit._id = new ObjectId(exItem.sourcePurchaseOrder.unit._id);
                                exItem.sourcePurchaseOrder.category._id = new ObjectId(exItem.sourcePurchaseOrder.category._id);
                                exItem.sourcePurchaseOrder.unitId = new ObjectId(exItem.sourcePurchaseOrder.unit._id);
                                exItem.sourcePurchaseOrder.categoryId = new ObjectId(exItem.sourcePurchaseOrder.categoryId);

                                for (var soItem of exItem.sourcePurchaseOrder.items) {
                                    soItem.product._id = new ObjectId(soItem.product._id);
                                    soItem.product.uom._id = new ObjectId(soItem.product.uom._id);
                                    soItem.defaultUom._id = new ObjectId(soItem.defaultUom._id);
                                }
                            }
                            exItem.unitId = new ObjectId(exItem.unit._id);
                            exItem.unit._id = new ObjectId(exItem.unit._id);
                            exItem.categoryId = new ObjectId(exItem.category._id);
                            exItem.category._id = new ObjectId(exItem.category._id);
                            for (var poItem of exItem.items) {
                                poItem.product._id = new ObjectId(poItem.product._id);
                                poItem.product.uom._id = new ObjectId(poItem.product.uom._id);
                                poItem.defaultUom._id = new ObjectId(poItem.defaultUom._id);
                                poItem.dealUom._id = new ObjectId(poItem.dealUom._id);
                            }
                        }

                        for (var fulfillment of item.fulfillments) {
                            fulfillment.purchaseOrderId = new ObjectId(fulfillment.purchaseOrder._id);
                            fulfillment.purchaseOrder._id = new ObjectId(fulfillment.purchaseOrder._id);
                            fulfillment.purchaseOrder.unitId = new ObjectId(fulfillment.purchaseOrder.unit._id);
                            fulfillment.purchaseOrder.unit._id = new ObjectId(fulfillment.purchaseOrder.unit._id);
                            fulfillment.purchaseOrder.categoryId = new ObjectId(fulfillment.purchaseOrder.category._id);
                            fulfillment.purchaseOrder.category._id = new ObjectId(fulfillment.purchaseOrder.category._id);
                            fulfillment.productId = new ObjectId(fulfillment.product._idd);
                            fulfillment.product._id = new ObjectId(fulfillment.product._id);
                        }
                    }
                    if (!valid.stamp)
                        valid = new DeliveryOrder(valid);

                    valid.supplierId = new ObjectId(valid.supplier._id);
                    valid.supplier._id = new ObjectId(valid.supplier._id);
                    for (var doItem of valid.items) {
                        doItem.purchaseOrderExternalId = new ObjectId(doItem.purchaseOrderExternal._id);
                        doItem.purchaseOrderExternal._id = new ObjectId(doItem.purchaseOrderExternal._id);
                        for (var fulfillment of doItem.fulfillments) {
                            fulfillment.purchaseOrderId = new ObjectId(fulfillment.purchaseOrder._id);
                            fulfillment.purchaseOrder._id = new ObjectId(fulfillment.purchaseOrder._id);
                            fulfillment.productId = new ObjectId(fulfillment.product._id);
                            fulfillment.product._id = new ObjectId(fulfillment.product._id);
                        }
                    }

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
            var getPurchaseOrderById = [];
            this._validate(deliveryOrder)
                .then(validDeliveryOrder => {
                    validDeliveryOrder.supplierId = new ObjectId(validDeliveryOrder.supplierId);
                    //UPDATE PO INTERNAL
                    var poId=new ObjectId();
                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                        for (var fulfillmentItem of validDeliveryOrderItem.fulfillments) {
                            if(!poId .equals(fulfillmentItem.purchaseOrder._id)){
                                poId=new ObjectId(fulfillmentItem.purchaseOrder._id);
                                getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(fulfillmentItem.purchaseOrder._id));
                            }
                        }
                        Promise.all(getPurchaseOrderById)
                            .then(results => {
                                for (var purchaseOrder of results) {
                                    for (var poItem of purchaseOrder.items) {
                                        for (var fulfillment of validDeliveryOrderItem.fulfillments) {
                                            if (purchaseOrder._id.equals(fulfillment.purchaseOrder._id) && poItem.product._id.equals(fulfillment.product._id)) {
                                                var fulfillmentObj = {
                                                    deliveryOderNo: validDeliveryOrder.no,
                                                    deliveryOderDeliveredQuantity: fulfillment.deliveredQuantity,
                                                    deliveryOderDate: validDeliveryOrder.date,
                                                    supplierDoDate: validDeliveryOrder.supplierDoDate
                                                };
                                                poItem.fulfillments.push(fulfillmentObj);

                                                var totalRealize = 0;
                                                for (var poItemFulfillment of poItem.fulfillments) {
                                                    totalRealize += poItemFulfillment.deliveryOderDeliveredQuantity;
                                                }
                                                poItem.realizationQuantity = totalRealize;
                                                if (poItem.realizationQuantity == poItem.dealQuantity)
                                                    poItem.isClosed = true;
                                                else
                                                    poItem.isClosed = false;
                                                fulfillment.purchaseOrder = purchaseOrder;
                                                break;
                                            }
                                        }
                                        if (poItem.isClosed == true)
                                            purchaseOrder.isClosed = true;
                                        else 
                                            purchaseOrder.isClosed = false;
                                    }
                                    tasks.push(this.purchaseOrderManager.update(purchaseOrder));
                                }
                                Promise.all(tasks)
                                    .then(results => {
                                        //UPDATE PO EXTERNAL
                                        for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                            var purchaseOrderExternal = validDeliveryOrderItem.purchaseOrderExternal;
                                            var getPurchaseOrderById = [];
                                            for (var poExternalItem of purchaseOrderExternal.items) {
                                                getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(poExternalItem._id));
                                            }
                                            Promise.all(getPurchaseOrderById)
                                                .then(results => {
                                                    for (var result of results) {
                                                        if (result.isClosed == true)
                                                            purchaseOrderExternal.isClosed = true;
                                                        else {
                                                            purchaseOrderExternal.isClosed = false;
                                                            break;
                                                        }
                                                    }
                                                    purchaseOrderExternal.items = results;
                                                    validDeliveryOrderItem.purchaseOrderExternal = purchaseOrderExternal;
                                                    tasksPoExternal.push(this.purchaseOrderExternalManager.update(purchaseOrderExternal));
                                                })
                                                .catch(e => {
                                                    reject(e);
                                                });

                                        }
                                        Promise.all(tasksPoExternal)
                                            .then(results => {
                                                var getPoExternalByID = [];
                                                for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                    getPoExternalByID.push(this.purchaseOrderExternalManager.getSingleById(validDeliveryOrderItem.purchaseOrderExternal._id));
                                                }
                                                Promise.all(getPoExternalByID)
                                                    .then(results => {
                                                        for (var poExternal of results) {
                                                            for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                                if (validDeliveryOrderItem.purchaseOrderExternal._id.equals(poExternal._id)) {
                                                                    validDeliveryOrderItem.purchaseOrderExternal = poExternal;
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                        this.collection.insert(validDeliveryOrder)
                                                            .then(id => {
                                                                resolve(id);
                                                            })
                                                            .catch(e => {
                                                                reject(e);
                                                            })
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
                            })
                            .catch(e => {
                                reject(e);
                            });
                    }
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