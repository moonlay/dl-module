'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;

// internal deps 
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var DeliveryOrder = DLModels.purchasing.DeliveryOrder;
var PurchaseOrderManager = require('./purchase-order-manager');
var PurchaseOrderExternalManager = require('./purchase-order-external-manager');
var PurchaseRequestManager = require('./purchase-request-manager');
var i18n = require('dl-i18n');
var SupplierManager = require('../master/supplier-manager');
var prStatusEnum = DLModels.purchasing.enum.PurchaseRequestStatus;
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;
var generateCode = require('../../utils/code-generator');

module.exports = class DeliveryOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.DeliveryOrder);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, user);
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        },
            keywordFilter = {};


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

        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
    }

    _validate(deliveryOrder) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = deliveryOrder;
            var now = new Date();

            var dbData = this.getSingleByIdOrDefault(valid._id);

            var getDeliveryderPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                },
                    { _deleted: false },
                    { no: valid.no },
                    { supplierId: new ObjectId(valid.supplierId) }
                ]
            });
            var getDeliveryderByRefNoPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        "refNo": valid.refNo
                    }]
            });
            var getSupplier = valid.supplier && ObjectId.isValid(valid.supplier._id) ? this.supplierManager.getSingleByIdOrDefault(valid.supplier._id) : Promise.resolve(null);
            var getPoExternal = [];
            for (var doItem of valid.items || [])
                if (doItem.hasOwnProperty("purchaseOrderExternal")) {
                    if (ObjectId.isValid(doItem.purchaseOrderExternal._id))
                        getPoExternal.push(this.purchaseOrderExternalManager.getSingleByIdOrDefault(doItem.purchaseOrderExternal._id));
                }
            Promise.all([dbData, getDeliveryderPromise, getSupplier, getDeliveryderByRefNoPromise].concat(getPoExternal))
                .then(results => {
                    var _original = results[0];
                    var _module = results[1];
                    var _supplier = results[2];
                    var _dobyRefNo = results[3];
                    var _poExternals = results.slice(4, results.length) || [];

                    if (!valid.no || valid.no === "")
                        errors["no"] = i18n.__("DeliveryOrder.no.isRequired:%s is required", i18n.__("DeliveryOrder.no._:No")); //"Nomor surat jalan tidak boleh kosong";
                    else if (_module)
                        errors["no"] = i18n.__("DeliveryOrder.no.isExists:%s is already exists", i18n.__("DeliveryOrder.no._:No")); //"Nomor surat jalan sudah terdaftar";

                    if (_original && (!valid.refNo || valid.refNo === ""))
                        errors["refNo"] = i18n.__("DeliveryOrder.refNo.isRequired:%s is required", i18n.__("DeliveryOrder.refNo._:Ref No")); //"Nomor surat jalan tidak boleh kosong";
                    else if (_dobyRefNo)
                        errors["refNo"] = i18n.__("DeliveryOrder.refNo.isExists:%s is already exists", i18n.__("DeliveryOrder.refNo._:Ref No")); //"Nomor surat jalan sudah terdaftar";

                    if (!valid.date || valid.date === "")
                        errors["date"] = i18n.__("DeliveryOrder.date.isRequired:%s is required", i18n.__("DeliveryOrder.date._:Date")); //"Tanggal surat jalan tidak boleh kosong";
                    // else if (valid.date > now)
                    //     errors["date"] = i18n.__("DeliveryOrder.date.isGreater:%s is greater than today", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                    if (!valid.supplierDoDate || valid.supplierDoDate === "")
                        errors["supplierDoDate"] = i18n.__("DeliveryOrder.supplierDoDate.isRequired:%s is required", i18n.__("DeliveryOrder.supplierDoDate._:SupplierDoDate")); //"Tanggal surat jalan supplier tidak boleh kosong";

                    if (!valid.supplierId || valid.supplierId.toString() === "")
                        errors["supplier"] = i18n.__("DeliveryOrder.supplier.name.isRequired:%s is required", i18n.__("DeliveryOrder.supplier.name._:NameSupplier")); //"Nama supplier tidak boleh kosong";    
                    else if (!_supplier)
                        errors["supplier"] = i18n.__("DeliveryOrder.supplier.name.isRequired:%s is required", i18n.__("DeliveryOrder.supplier.name._:NameSupplier")); //"Nama supplier tidak boleh kosong";

                    if (valid.items && valid.items.length > 0) {
                        var deliveryOrderItemErrors = [];
                        var deliveryOrderItemHasError = false;
                        for (var doItem of valid.items || []) {
                            var purchaseOrderExternalItemErrors = [];
                            var purchaseOrderExternalItemHasErrors = false;
                            var purchaseOrderExternalError = {};
                            var fulfillmentError = {};
                            if (Object.getOwnPropertyNames(doItem).length === 0) {
                                purchaseOrderExternalItemHasErrors = true;
                                purchaseOrderExternalError["purchaseOrderExternal"] = i18n.__("DeliveryOrder.items.purchaseOrderExternal.isRequired:%s is required", i18n.__("DeliveryOrder.items.purchaseOrderExternal._:PurchaseOrderExternal")); //"Purchase order external tidak boleh kosong";
                            }
                            else if (!doItem.purchaseOrderExternal) {
                                purchaseOrderExternalItemHasErrors = true;
                                purchaseOrderExternalError["purchaseOrderExternal"] = i18n.__("DeliveryOrder.items.purchaseOrderExternal.isRequired:%s is required", i18n.__("DeliveryOrder.items.purchaseOrderExternal._:PurchaseOrderExternal")); //"Purchase order external tidak boleh kosong";
                            }
                            else {
                                for (var _poExternal of _poExternals) {
                                    if (_poExternal._id.toString() == doItem.purchaseOrderExternal._id.toString()) {
                                        if (!_poExternal.isPosted) {
                                            purchaseOrderExternalItemHasErrors = true;
                                            purchaseOrderExternalError["purchaseOrderExternal"] = i18n.__("DeliveryOrder.items.purchaseOrderExternal.isPosted:%s is need to be posted", i18n.__("DeliveryOrder.items.purchaseOrderExternal._:PurchaseOrderExternal"));
                                        }
                                        else if (_poExternal.isUsed) {
                                            purchaseOrderExternalItemHasErrors = true;
                                            purchaseOrderExternalError["purchaseOrderExternal"] = i18n.__("DeliveryOrder.items.purchaseOrderExternal.isUsed:%s is already closed", i18n.__("DeliveryOrder.items.purchaseOrderExternal._:PurchaseOrderExternal"));
                                        }
                                        break;
                                    }
                                }
                            }

                            if (doItem.fulfillments.length === 0) {
                                fulfillmentError = {};
                                purchaseOrderExternalItemHasErrors = true;
                                fulfillmentError["purchaseOrder"] = i18n.__("DeliveryOrder.items.fulfillments.purchaseOrder.isRequired:%s is required", i18n.__("DeliveryOrder.items.fulfillments.purchaseOrder._:PurchaseOrderInternal"));
                                purchaseOrderExternalItemErrors.push(fulfillmentError);
                            }
                            else {
                                for (var doFulfillment of doItem.fulfillments || []) {
                                    fulfillmentError = {};

                                    if (Object.getOwnPropertyNames(doFulfillment).length === 0) {
                                        fulfillmentError = {};
                                        purchaseOrderExternalItemHasErrors = true;
                                        fulfillmentError["purchaseOrder"] = i18n.__("DeliveryOrder.items.fulfillments.purchaseOrder.isRequired:%s is required", i18n.__("DeliveryOrder.items.fulfillments.purchaseOrder._:PurchaseOrderInternal"));
                                    }
                                    if (!doFulfillment.deliveredQuantity || doFulfillment.deliveredQuantity === 0) {
                                        purchaseOrderExternalItemHasErrors = true;
                                        fulfillmentError["deliveredQuantity"] = i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity.isRequired:%s is required or not 0", i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity._:DeliveredQuantity")); //"Jumlah barang diterima tidak boleh kosong";
                                    }
                                    purchaseOrderExternalItemErrors.push(fulfillmentError);
                                }
                            }
                            if (purchaseOrderExternalItemHasErrors) {
                                deliveryOrderItemHasError = true;
                                purchaseOrderExternalError["fulfillments"] = purchaseOrderExternalItemErrors;
                            }
                            deliveryOrderItemErrors.push(purchaseOrderExternalError);
                            if (purchaseOrderExternalItemHasErrors)
                                errors["items"] = deliveryOrderItemErrors;
                        }
                    }
                    else
                        errors["items"] = i18n.__("DeliveryOrder.items.isRequired:%s is required", i18n.__("DeliveryOrder.items.name._:Items")); //"Harus ada minimal 1 nomor po eksternal";


                    // 2c. begin: check if data has any error, reject if it has.
                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.supplier = _supplier;
                    valid.supplierId = new ObjectId(valid.supplier._id);
                    valid.date = new Date(valid.date);
                    valid.supplierDoDate = new Date(valid.supplierDoDate);


                    for (var item of valid.items) {
                        for (var poExternal of _poExternals) {
                            if (item.purchaseOrderExternal._id.toString() === poExternal._id.toString()) {
                                item.purchaseOrderExternal = poExternal;
                                item.purchaseOrderExternalId = new ObjectId(poExternal._id);

                                for (var fulfillment of item.fulfillments) {
                                    for (var poInternal of poExternal.items) {
                                        if (fulfillment.purchaseOrder._id.toString() === poInternal._id.toString()) {
                                            for (var poItem of poInternal.items) {
                                                if (fulfillment.product._id.toString() === poItem.product._id.toString()) {
                                                    fulfillment.product = poItem.product;
                                                    fulfillment.productId = new ObjectId(poItem.product._id);
                                                    fulfillment.purchaseOrder = poInternal;
                                                    fulfillment.purchaseOrderId = new ObjectId(fulfillment.purchaseOrder._id);
                                                    fulfillment.purchaseOrderUom._id = new ObjectId(fulfillment.purchaseOrderUom._id);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                break;
                            }
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

    _beforeInsert(deliveryOrder) {
        deliveryOrder.refNo = generateCode();
        return Promise.resolve(deliveryOrder)
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((deliveryOrder) => this.getRealization(deliveryOrder))
            .then((realizations) => this.updatePurchaseRequest(realizations))
            .then((realizations) => this.updatePurchaseOrder(realizations))
            .then((realizations) => this.updatePurchaseOrderExternal(realizations))
            .then(() => {
                return this.syncItems(id);
            })
    }

    _beforeUpdate(deliveryOrder) {
        return this.getSingleById(deliveryOrder._id)
            .then((oldDeliveryOrder) => {
                return this.mergeDeliveryOrder(deliveryOrder, oldDeliveryOrder)
                    .then((realizations) => {
                        if (realizations.length > 0) {
                            return this.updatePurchaseRequestDeleteDO(realizations)
                                .then((realizations) => this.updatePurchaseOrderDeleteDO(realizations))
                                .then((realizations) => this.updatePurchaseOrderExternal(realizations))
                                .then(() => {
                                    return Promise.resolve(deliveryOrder);
                                })
                        }
                        else {
                            return Promise.resolve(deliveryOrder);
                        }
                    })
            })

    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((deliveryOrder) => this.getRealization(deliveryOrder))
            .then((realizations) => this.updatePurchaseRequestUpdateDO(realizations))
            .then((realizations) => this.updatePurchaseOrderUpdateDO(realizations))
            .then((realizations) => this.updatePurchaseOrderExternal(realizations))
            .then(() => {
                return this.syncItems(id);
            })
    }

    getRealization(deliveryOrder) {
        var realizations = deliveryOrder.items.map((doItem) => {
            return doItem.fulfillments.map((fulfillment) => {
                return {
                    deliveryOrder: deliveryOrder,
                    purchaseOrderId: fulfillment.purchaseOrderId,
                    purchaseRequestId: fulfillment.purchaseOrder.purchaseRequestId,
                    purchaseOrderExternalId: doItem.purchaseOrderExternalId,
                    productId: fulfillment.productId,
                    deliveredQuantity: fulfillment.deliveredQuantity
                }
            })
        })
        realizations = [].concat.apply([], realizations);
        return Promise.resolve(realizations);
    }

    updatePurchaseRequest(realizations) {
        var deliveryOrder = realizations[0].deliveryOrder;

        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseRequestId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization.productId);
        }

        var jobs = [];
        map.forEach((productIds, purchaseRequestId) => {
            var job = this.purchaseRequestManager.getSingleById(purchaseRequestId)
                .then((purchaseRequest) => {
                    for (var productId of productIds) {
                        var prItem = purchaseRequest.items.find(item => item.productId.toString() === productId.toString());
                        if (prItem) {
                            prItem.deliveryOrderNos = prItem.deliveryOrderNos || [];
                            prItem.deliveryOrderNos.push(deliveryOrder.no);
                        }
                    }
                    return this.purchaseRequestManager.updateCollectionPR(purchaseRequest);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrder(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    for (var realization of realizations) {
                        var productId = realization.productId;
                        var poItem = purchaseOrder.items.find(item => item.product._id.toString() === productId.toString());
                        if (poItem) {
                            var deliveryOrder = realization.deliveryOrder;
                            var fulfillment = {
                                deliveryOrderNo: deliveryOrder.no,
                                deliveryOrderDeliveredQuantity: realization.deliveredQuantity,
                                deliveryOrderDate: deliveryOrder.date,
                                supplierDoDate: deliveryOrder.supplierDoDate
                            };

                            poItem.fulfillments = poItem.fulfillments || [];
                            poItem.fulfillments.push(fulfillment);

                            var _listDO = poItem.fulfillments.map((fulfillment) => fulfillment.deliveryOrderNo);
                            var _listDOUnique = _listDO.filter(function (elem, index, self) {
                                return index == self.indexOf(elem);
                            })

                            poItem.realizationQuantity = _listDOUnique
                                .map(deliveryOrderNo => {
                                    var _fulfillment = poItem.fulfillments.find((fulfillment) => fulfillment.deliveryOrderNo === deliveryOrderNo);
                                    return _fulfillment ? _fulfillment.deliveryOrderDeliveredQuantity : 0;
                                })
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);
                            if (purchaseOrder.status.value <= 5 && !purchaseOrder.isClosed) {
                                poItem.isClosed = poItem.realizationQuantity === poItem.dealQuantity;
                            }
                        }
                    }
                    if (purchaseOrder.status.value <= 5 && !purchaseOrder.isClosed) {
                        purchaseOrder.isClosed = purchaseOrder.items
                            .map((item) => item.isClosed)
                            .reduce((prev, curr, index) => {
                                return prev && curr
                            }, true);
                    }
                    if (purchaseOrder.status.value <= 5) {
                        purchaseOrder.status = purchaseOrder.isClosed ? poStatusEnum.ARRIVED : poStatusEnum.ARRIVING;
                    }
                    return this.purchaseRequestManager.getSingleById(purchaseOrder.purchaseRequestId)
                        .then((purchaseRequest) => {
                            purchaseRequest.status = purchaseOrder.isClosed ? prStatusEnum.COMPLETE : prStatusEnum.ARRIVING;
                            return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                        })
                        .then((purchaseRequest) => {
                            purchaseOrder.purchaseRequest = purchaseRequest;
                            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                        });
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrderExternal(realizations) {
        var map = new Map();
        for (var purchaseOrderId of realizations) {
            var key = purchaseOrderId.purchaseOrderExternalId.toString();
            if (!map.has(key))
                map.set(key, [])

            var purchaseOrderId = purchaseOrderId.purchaseOrderId.toString()
            if (map.get(key).indexOf(purchaseOrderId) < 0)
                map.get(key).push(purchaseOrderId);
        }

        var jobs = [];
        map.forEach((purchaseOrderIds, purchaseOrderExternalId) => {
            var job = this.purchaseOrderExternalManager.getSingleById(purchaseOrderExternalId)
                .then((purchaseOrderExternal) => {
                    return Promise.all(purchaseOrderIds.map((purchaseOrderId) => {
                        return this.purchaseOrderManager.getSingleById(purchaseOrderId)
                    }))
                        .then((purchaseOrders) => {

                            for (var purchaseOrder of purchaseOrders) {
                                var item = purchaseOrderExternal.items.find(item => item._id.toString() === purchaseOrder._id.toString());
                                var index = purchaseOrderExternal.items.indexOf(item);
                                if (index !== -1) {
                                    purchaseOrderExternal.items.splice(index, 1, purchaseOrder);
                                }
                            }

                            purchaseOrderExternal.isClosed = purchaseOrderExternal.items
                                .map((item) => item.isClosed)
                                .reduce((prev, curr, index) => {
                                    return prev && curr
                                }, true);
                            purchaseOrderExternal.status = poStatusEnum.ARRIVING;
                            return this.purchaseOrderExternalManager.update(purchaseOrderExternal);
                        })
                })
            jobs.push(job);
        });

        return Promise.all(jobs);
    }

    syncItems(id) {
        var query = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
        };
        return this.getSingleByQuery(query)
            .then((deliveryOrder) => {
                var getPOInternals = [];
                var poInternalId = [];
                deliveryOrder.items.map((doItem) => {
                    return doItem.fulfillments.map((fulfillment) => {
                        if (poInternalId.indexOf(fulfillment.purchaseOrderId) == -1) {
                            poInternalId.push(fulfillment.purchaseOrderId);
                            getPOInternals.push(this.purchaseOrderManager.getSingleById(fulfillment.purchaseOrderId));
                        }

                    })
                })
                var getPoExternals = deliveryOrder.items.map((item) => {
                    return this.purchaseOrderExternalManager.getSingleById(item.purchaseOrderExternalId)
                })
                return Promise.all(getPoExternals)
                    .then((purchaseOrderExternals) => {
                        return Promise.all(getPOInternals)
                            .then((purchaseOrderInternals) => {
                                for (var item of deliveryOrder.items) {
                                    var purchaseOrderExternal = purchaseOrderExternals.find(purchaseOrderExternal => item.purchaseOrderExternalId.toString() === purchaseOrderExternal._id.toString())
                                    if (purchaseOrderExternal) {
                                        item.purchaseOrderExternal = purchaseOrderExternal;
                                        for (var fulfillment of item.fulfillments) {
                                            var purchaseOrder = purchaseOrderInternals.find(purchaseOrderInternal => purchaseOrderInternal._id.toString() === fulfillment.purchaseOrderId.toString())
                                            if (purchaseOrder) {
                                                fulfillment.purchaseOrder = purchaseOrder;
                                            }
                                        }
                                    }
                                }
                                return this.collection
                                    .updateOne({
                                        _id: deliveryOrder._id
                                    }, {
                                        $set: deliveryOrder
                                    })
                                    .then((result) => Promise.resolve(deliveryOrder._id));
                            })
                    })
            })
    }

    mergeDeliveryOrder(newDeliveryOrder, oldDeliveryOrder) {
        return this.getRealization(newDeliveryOrder)
            .then((newRealizations) => {
                return this.getRealization(oldDeliveryOrder)
                    .then((oldRealizations) => {
                        var realizations = [];
                        for (var oldRealization of oldRealizations) {
                            var realization = newRealizations.find(item =>
                                item.purchaseOrderId.toString() === oldRealization.purchaseOrderId.toString() &&
                                item.purchaseRequestId.toString() === oldRealization.purchaseRequestId.toString() &&
                                item.purchaseOrderExternalId.toString() === oldRealization.purchaseOrderExternalId.toString() &&
                                item.productId.toString() === oldRealization.productId.toString());

                            if (!realization) {
                                realizations.push(oldRealization);
                            }
                        }
                        return Promise.resolve(realizations);
                    });
            });
    }

    updatePurchaseRequestUpdateDO(realizations) {
        var deliveryOrder = realizations[0].deliveryOrder;

        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseRequestId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization.productId);
        }

        var jobs = [];
        map.forEach((productIds, purchaseRequestId) => {
            var job = this.purchaseRequestManager.getSingleById(purchaseRequestId)
                .then((purchaseRequest) => {
                    for (var productId of productIds) {
                        var prItem = purchaseRequest.items.find(item => item.productId.toString() === productId.toString());
                        if (prItem) {
                            prItem.deliveryOrderNos = prItem.deliveryOrderNos || [];
                            var _index = prItem.deliveryOrderNos.indexOf(deliveryOrder.no);
                            if (_index === -1) {
                                prItem.deliveryOrderNos.push(deliveryOrder.no);
                            }
                        }
                    }
                    return this.purchaseRequestManager.updateCollectionPR(purchaseRequest);
                });
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrderUpdateDO(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        return this.getSingleById(realization.deliveryOrder._id)
            .then((oldDeliveryOrder) => {
                var jobs = [];
                map.forEach((realizations, purchaseOrderId) => {
                    var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                        .then((purchaseOrder) => {
                            for (var realization of realizations) {
                                var productId = realization.productId;
                                var poItem = purchaseOrder.items.find(item => item.product._id.toString() === productId.toString());
                                if (poItem) {
                                    var deliveryOrder = realization.deliveryOrder;
                                    poItem.fulfillments = poItem.fulfillments || [];
                                    if (deliveryOrder._id) {
                                        var item = poItem.fulfillments.find(item => item.deliveryOrderNo === oldDeliveryOrder.no);
                                        if (item) {
                                            var index = poItem.fulfillments.indexOf(item);
                                            poItem.fulfillments[index].deliveryOrderNo = deliveryOrder.no;
                                            poItem.fulfillments[index].deliveryOrderDeliveredQuantity = realization.deliveredQuantity;
                                            poItem.fulfillments[index].deliveryOrderDate = deliveryOrder.date;
                                            poItem.fulfillments[index].supplierDoDate = deliveryOrder.supplierDoDate;
                                        } else {
                                            var fulfillment = {
                                                deliveryOrderNo: deliveryOrder.no,
                                                deliveryOrderDeliveredQuantity: realization.deliveredQuantity,
                                                deliveryOrderDate: deliveryOrder.date,
                                                supplierDoDate: deliveryOrder.supplierDoDate
                                            };

                                            poItem.fulfillments = poItem.fulfillments || [];
                                            poItem.fulfillments.push(fulfillment);
                                        }
                                    }
                                    var _listDO = poItem.fulfillments.map((fulfillment) => fulfillment.deliveryOrderNo);
                                    var _listDOUnique = _listDO.filter(function (elem, index, self) {
                                        return index == self.indexOf(elem);
                                    })

                                    poItem.realizationQuantity = _listDOUnique
                                        .map(deliveryOrderNo => {
                                            var _fulfillment = poItem.fulfillments.find((fulfillment) => fulfillment.deliveryOrderNo === deliveryOrderNo);
                                            return _fulfillment ? _fulfillment.deliveryOrderDeliveredQuantity : 0;
                                        })
                                        .reduce((prev, curr, index) => {
                                            return prev + curr;
                                        }, 0);
                                    if (purchaseOrder.status.value <= 5 || !purchaseOrder.isClosed) {
                                        poItem.isClosed = poItem.realizationQuantity === poItem.dealQuantity;
                                    }
                                }
                            }
                            if (purchaseOrder.status.value <= 5 || !purchaseOrder.isClosed) {
                                purchaseOrder.isClosed = purchaseOrder.items
                                    .map((item) => item.isClosed)
                                    .reduce((prev, curr, index) => {
                                        return prev && curr
                                    }, true);
                            }
                            if (purchaseOrder.status.value <= 5) {
                                purchaseOrder.status = purchaseOrder.isClosed ? poStatusEnum.ARRIVED : poStatusEnum.ARRIVING;
                            }
                            return this.purchaseRequestManager.getSingleById(purchaseOrder.purchaseRequestId)
                                .then((purchaseRequest) => {
                                    purchaseRequest.status = purchaseOrder.isClosed ? prStatusEnum.COMPLETE : prStatusEnum.ARRIVING;
                                    return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                                })
                                .then((purchaseRequest) => {
                                    purchaseOrder.purchaseRequest = purchaseRequest;
                                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                                });
                        })
                    jobs.push(job);
                })

                return Promise.all(jobs).then((results) => {
                    return Promise.resolve(realizations);
                })
            })
    }

    updatePurchaseRequestDeleteDO(realizations) {
        var deliveryOrder = realizations[0].deliveryOrder;

        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseRequestId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization.productId);
        }

        var jobs = [];
        map.forEach((productIds, purchaseRequestId) => {
            var job = this.purchaseRequestManager.getSingleById(purchaseRequestId)
                .then((purchaseRequest) => {
                    for (var productId of productIds) {
                        var prItem = purchaseRequest.items.find(item => item.productId.toString() === productId.toString());
                        if (prItem) {
                            prItem.deliveryOrderNos = prItem.deliveryOrderNos || [];
                            var _index = prItem.deliveryOrderNos.indexOf(deliveryOrder.no);
                            if (_index !== -1) {
                                prItem.deliveryOrderNos.splice(_index, 1);
                            }
                        }
                    }
                    var prStatus = purchaseRequest.items
                        .map((item) => item.deliveryOrderNos.length)
                        .reduce((prev, curr, index) => {
                            return prev + curr
                        }, 0);

                    purchaseRequest.status = prStatus > 0 ? prStatusEnum.ARRIVING : prStatusEnum.ORDERED;

                    return this.purchaseRequestManager.updateCollectionPR(purchaseRequest);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrderDeleteDO(realizations) {
        var deliveryOrder = realizations[0].deliveryOrder;
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    return this.purchaseRequestManager.getSingleById(purchaseOrder.purchaseRequestId)
                        .then((purchaseRequest) => {
                            purchaseOrder.purchaseRequest = purchaseRequest;

                            for (var realization of realizations) {
                                var productId = realization.productId;
                                var poItem = purchaseOrder.items.find(item => item.product._id.toString() === productId.toString());
                                if (poItem) {
                                    poItem.fulfillments = poItem.fulfillments || [];
                                    var item = poItem.fulfillments.find(item => item.deliveryOrderNo === deliveryOrder.no);
                                    var _index = poItem.fulfillments.indexOf(item);
                                    if (_index !== -1) {
                                        poItem.fulfillments.splice(_index, 1);
                                    }
                                    var _listDO = poItem.fulfillments.map((fulfillment) => fulfillment.deliveryOrderNo);
                                    var _listDOUnique = _listDO.filter(function (elem, index, self) {
                                        return index == self.indexOf(elem);
                                    })

                                    poItem.realizationQuantity = _listDOUnique
                                        .map(deliveryOrderNo => {
                                            var _fulfillment = poItem.fulfillments.find((fulfillment) => fulfillment.deliveryOrderNo === deliveryOrderNo);
                                            return _fulfillment ? _fulfillment.deliveryOrderDeliveredQuantity : 0;
                                        })
                                        .reduce((prev, curr, index) => {
                                            return prev + curr;
                                        }, 0);
                                    if (purchaseOrder.purchaseRequest.status.value !== 9) {
                                        poItem.isClosed = poItem.realizationQuantity === poItem.dealQuantity;
                                    }
                                }
                            }
                            if (purchaseOrder.purchaseRequest.status.value !== 9) {
                                purchaseOrder.isClosed = purchaseOrder.items
                                    .map((item) => item.isClosed)
                                    .reduce((prev, curr, index) => {
                                        return prev && curr
                                    }, true);
                            }
                            var poStatus = purchaseOrder.items
                                .map((item) => item.fulfillments.length)
                                .reduce((prev, curr, index) => {
                                    return prev + curr
                                }, 0);
                            if (purchaseOrder.status.value <= 5) {
                                purchaseOrder.status = poStatus > 0 ? poStatusEnum.ARRIVING : poStatusEnum.ORDERED;
                            }
                            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                        });
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrderExternalDeleteDO(realizations) {
        var map = new Map();
        for (var purchaseOrderId of realizations) {
            var key = purchaseOrderId.purchaseOrderExternalId.toString();
            if (!map.has(key))
                map.set(key, [])

            var purchaseOrderId = purchaseOrderId.purchaseOrderId.toString()
            if (map.get(key).indexOf(purchaseOrderId) < 0)
                map.get(key).push(purchaseOrderId);
        }

        var jobs = [];
        map.forEach((purchaseOrderIds, purchaseOrderExternalId) => {
            var job = this.purchaseOrderExternalManager.getSingleById(purchaseOrderExternalId)
                .then((purchaseOrderExternal) => {
                    return Promise.all(purchaseOrderIds.map((purchaseOrderId) => {
                        return this.purchaseOrderManager.getSingleById(purchaseOrderId)
                    }))
                        .then((purchaseOrders) => {

                            for (var purchaseOrder of purchaseOrders) {
                                var item = purchaseOrderExternal.items.find(item => item._id.toString() === purchaseOrder._id.toString());
                                var index = purchaseOrderExternal.items.indexOf(item);
                                if (index !== -1) {
                                    purchaseOrderExternal.items.splice(index, 1, purchaseOrder);
                                }
                            }

                            purchaseOrderExternal.isClosed = purchaseOrderExternal.items
                                .map((item) => item.isClosed)
                                .reduce((prev, curr, index) => {
                                    return prev && curr
                                }, true);
                            purchaseOrderExternal.status = poStatusEnum.ORDERED;
                            return this.purchaseOrderExternalManager.update(purchaseOrderExternal);
                        })
                })
            jobs.push(job);
        });

        return Promise.all(jobs);
    }

    delete(deliveryOrder) {
        return this._pre(deliveryOrder)
            .then((validData) => {
                validData._deleted = true;
                return this.collection.update(validData)
                    .then((id) => {
                        var query = {
                            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
                        };
                        return this.getSingleByQuery(query)
                            .then((deliveryOrder) => this.getRealization(deliveryOrder))
                            .then((realizations) => this.updatePurchaseRequestDeleteDO(realizations))
                            .then((realizations) => this.updatePurchaseOrderDeleteDO(realizations))
                            .then((realizations) => this.updatePurchaseOrderExternalDeleteDO(realizations))
                            .then(() => {
                                return this.syncItems(id);
                            })
                    })
            });
    }

    getDataDeliveryOrder(no, supplierId, dateFrom, dateTo, createdBy) {
        return new Promise((resolve, reject) => {
            var query = Object.assign({});

            var deleted = { _deleted: false };

            if (no !== "undefined" && no !== "") {
                var _no = {
                    no: no
                };
                Object.assign(query, _no);
            }
            if (supplierId !== "undefined" && supplierId !== "") {
                var _supplierId = {
                    supplierId: new ObjectId(supplierId)
                };
                Object.assign(query, _supplierId);
            }
            if (dateFrom !== "undefined" && dateFrom !== "" && dateFrom !== "null" && dateTo !== "undefined" && dateTo !== "" && dateTo !== "null") {
                var supplierDoDate = {
                    supplierDoDate: {
                        $gte: new Date(dateFrom),
                        $lte: new Date(dateTo)
                    }
                };
                Object.assign(query, supplierDoDate);
            }
            if (createdBy !== undefined && createdBy !== "") {
                Object.assign(query, {
                    _createdBy: createdBy
                });
            }

            Object.assign(query, deleted);

            this.collection
                .where(query)
                .execute()
                .then(PurchaseOrder => {
                    resolve(PurchaseOrder.data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.DeliveryOrder}_date`,
            key: {
                date: -1
            }
        }

        var refNoIndex = {
            name: `ix_${map.purchasing.collection.DeliveryOrder}_refNo`,
            key: {
                refNo: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, refNoIndex]);
    }

    getAllData(filter) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var query = Object.assign({});
                    query = Object.assign(query, filter);
                    query = Object.assign(query, {
                        _deleted: false
                    });

                    var _select = ["no",
                        "date",
                        "supplier",
                        "_createdBy",
                        "items.purchaseOrderExternal",
                        "items.fulfillments.product",
                        "items.fulfillments.purchaseOrderQuantity",
                        "items.fulfillments.purchaseOrderUom",
                        "items.fulfillments.deliveredQuantity"
                    ];

                    this.collection.where(query).select(_select).execute()
                        .then((results) => {
                            resolve(results.data);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }

    updateCollectionDeliveryOrder(deliveryOrder) {
        if (!deliveryOrder.stamp) {
            deliveryOrder = new DeliveryOrder(deliveryOrder);
        }
        deliveryOrder.stamp(this.user.username, 'manager');
        return this.collection
            .updateOne({
                _id: deliveryOrder._id
            }, {
                $set: deliveryOrder
            })
            .then((result) => Promise.resolve(deliveryOrder._id));
    }
};