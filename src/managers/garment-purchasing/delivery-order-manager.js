'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;

// internal deps 
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var DeliveryOrder = DLModels.garmentPurchasing.GarmentDeliveryOrder;
var PurchaseOrderManager = require('./purchase-order-manager');
var PurchaseOrderExternalManager = require('./purchase-order-external-manager');
var PurchaseRequestManager = require('./purchase-request-manager');
var i18n = require('dl-i18n');
var SupplierManager = require('../master/garment-supplier-manager');
var prStatusEnum = DLModels.purchasing.enum.PurchaseRequestStatus;
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;
var generateCode = require('../../utils/code-generator');
var moment = require('moment');
var assert = require('assert');

module.exports = class DeliveryOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentDeliveryOrder);
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
                        'purchaseOrderExternalNo': {
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

            var getDeliveryOrderPromise = this.collection.singleOrDefault({
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
            for (var doItem of valid.items || []) {
                if (doItem.hasOwnProperty("purchaseOrderExternalId")) {
                    if (ObjectId.isValid(doItem.purchaseOrderExternalId))
                        getPoExternal.push(this.purchaseOrderExternalManager.getSingleByIdOrDefault(doItem.purchaseOrderExternalId));
                }
            }
            valid.items = valid.items || [];
            var currencies = valid.items.map((doItem) => {
                return doItem.fulfillments.map((fulfillment) => {
                    return fulfillment.currency.code
                })
            })
            currencies = [].concat.apply([], currencies);
            currencies = currencies.filter(function (elem, index, self) {
                return index == self.indexOf(elem);
            })

            Promise.all([dbData, getDeliveryOrderPromise, getSupplier, getDeliveryderByRefNoPromise].concat(getPoExternal))
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
                        errors["supplierDoDate"] = i18n.__("DeliveryOrder.supplierDoDate.isRequired:%s is required", i18n.__("DeliveryOrder.supplierDoDate._:Supplier DO Date")); //"Tanggal surat jalan supplier tidak boleh kosong";

                    if (!valid.supplierId || valid.supplierId.toString() === "")
                        errors["supplier"] = i18n.__("DeliveryOrder.supplier.name.isRequired:%s is required", i18n.__("DeliveryOrder.supplier.name._:Supplier Name")); //"Nama supplier tidak boleh kosong";    
                    else if (!_supplier)
                        errors["supplier"] = i18n.__("DeliveryOrder.supplier.name.isRequired:%s is required", i18n.__("DeliveryOrder.supplier.name._:Supplier Name")); //"Nama supplier tidak boleh kosong";
                    if (valid.supplier) {
                        if (valid.supplier.import) {
                            if (!valid.shipmentType || valid.shipmentType === "") {
                                errors["shipmentType"] = i18n.__("DeliveryOrder.shipmentType.isRequired:%s is required", i18n.__("DeliveryOrder.shipmentType._:Shipment Type"));
                            }
                            if (!valid.shipmentNo || valid.shipmentNo === "") {
                                errors["shipmentNo"] = i18n.__("DeliveryOrder.shipmentNo.isRequired:%s is required", i18n.__("DeliveryOrder.shipmentNo._:Shipment No"));
                            }
                        }
                    }
                    if (valid.items && valid.items.length > 0) {
                        var deliveryOrderItemErrors = [];
                        for (var doItem of valid.items || []) {
                            var _poExternal = {};
                            var deliveryOrderItemError = {};
                            if (Object.getOwnPropertyNames(doItem).length === 0) {
                                deliveryOrderItemError["purchaseOrderExternalId"] = i18n.__("DeliveryOrder.items.purchaseOrderExternalId.isRequired:%s is required", i18n.__("DeliveryOrder.items.purchaseOrderExternalId._:PurchaseOrderExternal")); //"Purchase order external tidak boleh kosong";
                            }
                            else if (!doItem.purchaseOrderExternalId) {
                                deliveryOrderItemError["purchaseOrderExternalId"] = i18n.__("DeliveryOrder.items.purchaseOrderExternalId.isRequired:%s is required", i18n.__("DeliveryOrder.items.purchaseOrderExternalId._:PurchaseOrderExternal")); //"Purchase order external tidak boleh kosong";
                            }
                            else {
                                _poExternal = _poExternals.find(poExternal => poExternal._id.toString() == doItem.purchaseOrderExternalId.toString())
                                if (_poExternal) {
                                    if (!_poExternal.isPosted) {
                                        deliveryOrderItemError["purchaseOrderExternalId"] = i18n.__("DeliveryOrder.items.purchaseOrderExternalId.isPosted:%s is need to be posted", i18n.__("DeliveryOrder.items.purchaseOrderExternalId._:PurchaseOrderExternal"));
                                    }
                                    else if (_poExternal.isClosed && !ObjectId.isValid(valid._id)) {
                                        deliveryOrderItemError["purchaseOrderExternalId"] = i18n.__("DeliveryOrder.items.purchaseOrderExternalId.isClosed:%s is already closed", i18n.__("DeliveryOrder.items.purchaseOrderExternalId._:PurchaseOrderExternal"));
                                    }
                                }
                            }

                            var fulfillmentErrors = [];
                            for (var doFulfillment of doItem.fulfillments || []) {
                                var fulfillmentError = {};

                                var poExternalItem = _poExternal.items.find((item) => item.poId.toString() === doFulfillment.purchaseOrderId.toString() && item.product._id.toString() === doFulfillment.product._id.toString())
                                if (Object.getOwnPropertyNames(doFulfillment).length === 0) {
                                    fulfillmentError["purchaseOrderId"] = i18n.__("DeliveryOrder.items.fulfillments.purchaseOrderId.isRequired:%s is required", i18n.__("DeliveryOrder.items.fulfillments.purchaseOrderId._:PurchaseOrderInternal"));
                                } else if (poExternalItem.isClosed && !ObjectId.isValid(valid._id)) {
                                    fulfillmentError["purchaseOrderId"] = i18n.__("DeliveryOrder.items.fulfillments.purchaseOrderId.isRequired:%s is closed", i18n.__("DeliveryOrder.items.fulfillments.purchaseOrderId._:PurchaseOrderExternal"));
                                }

                                if (!doFulfillment.deliveredQuantity || doFulfillment.deliveredQuantity === 0) {
                                    fulfillmentError["deliveredQuantity"] = i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity.isRequired:%s is required or not 0", i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity._:DeliveredQuantity"));
                                }

                                if (!doFulfillment.quantityConversion || doFulfillment.quantityConversion === 0) {
                                    fulfillmentError["quantityConversion"] = i18n.__("DeliveryOrder.items.fulfillments.quantityConversion.isRequired:%s is required or not 0", i18n.__("DeliveryOrder.items.fulfillments.quantityConversion._:Quantity Conversion"));
                                }

                                if (!doFulfillment.uomConversion || !doFulfillment.uomConversion.unit || doFulfillment.uomConversion.unit === "") {
                                    fulfillmentError["uomConversion"] = i18n.__("DeliveryOrder.items.fulfillments.uomConversion.isRequired:%s is required", i18n.__("DeliveryOrder.items.fulfillments.uomConversion._:Uom Conversion"));
                                }

                                if (Object.getOwnPropertyNames(doFulfillment.uomConversion).length > 0 && Object.getOwnPropertyNames(doFulfillment.purchaseOrderUom).length > 0) {
                                    if (doFulfillment.uomConversion.unit.toString() === doFulfillment.purchaseOrderUom.unit.toString()) {
                                        if (doFulfillment.conversion !== 1) {
                                            // fulfillmentError["conversion"] = i18n.__("DeliveryOrder.items.fulfillments.conversion.mustOne:%s must be 1", i18n.__("DeliveryOrder.items.fulfillments.conversion._:Conversion"));
                                        }
                                    } else {
                                        if (doFulfillment.conversion === 1) {
                                            // fulfillmentError["conversion"] = i18n.__("DeliveryOrder.items.fulfillments.conversion.mustNotOne:%s must not be 1", i18n.__("DeliveryOrder.items.fulfillments.conversion._:Conversion"));
                                        }
                                    }
                                } else {
                                    fulfillmentError["uomConversion"] = i18n.__("DeliveryOrder.items.fulfillments.uomConversion.isRequired:%s is required", i18n.__("DeliveryOrder.items.fulfillments.uomConversion._:Uom Conversion"));
                                }

                                if (currencies.length > 1) {
                                    fulfillmentError["currency"] = i18n.__("DeliveryOrder.items.fulfillments.currency.isMultilpe:%s is multiple type", i18n.__("DeliveryOrder.items.fulfillments.currency._:Currency"));
                                }


                                fulfillmentErrors.push(fulfillmentError);
                            }
                            for (var fulfillmentError of fulfillmentErrors) {
                                if (Object.getOwnPropertyNames(fulfillmentError).length > 0) {
                                    deliveryOrderItemError.fulfillments = fulfillmentErrors;
                                    break;
                                }
                            }
                            deliveryOrderItemErrors.push(deliveryOrderItemError);
                        }

                        for (var deliveryOrderItemError of deliveryOrderItemErrors) {
                            if (Object.getOwnPropertyNames(deliveryOrderItemError).length > 0) {
                                errors.items = deliveryOrderItemErrors;
                                break;
                            }
                        }
                    }
                    else {
                        errors.items = [];
                        errors.items.push({ "purchaseOrderExternalId": i18n.__("DeliveryOrder.items.isRequired:%s is required", i18n.__("DeliveryOrder.items.name._:Items")) }); //"Harus ada minimal 1 nomor po eksternal";
                    }

                    // 2c. begin: check if data has any error, reject if it has.
                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.supplier = _supplier;
                    valid.supplierId = new ObjectId(valid.supplier._id);
                    valid.date = new Date(valid.date);
                    valid.supplierDoDate = new Date(valid.supplierDoDate);
                    if (!valid.useCustoms) {
                        valid.hasCustoms = false;
                    }

                    for (var item of valid.items) {
                        var poExternal = _poExternals.find(poExternal => item.purchaseOrderExternalId.toString() === poExternal._id.toString())
                        if (poExternal) {
                            item.purchaseOrderExternalNo = poExternal.no;
                            item.purchaseOrderExternalId = new ObjectId(poExternal._id);
                            item.paymentMethod = poExternal.paymentMethod;
                            item.paymentType = poExternal.paymentType;
                            item.paymentDueDays = poExternal.paymentDueDays;

                            for (var fulfillment of item.fulfillments) {
                                var poInternal = poExternal.items.find(poInternal => fulfillment.purchaseOrderId.toString() === poInternal.poId.toString() && fulfillment.product._id.toString() === poInternal.product._id.toString())
                                if (poInternal) {
                                    fulfillment.product = poInternal.product;
                                    fulfillment.purchaseOrderUom = poInternal.dealUom;
                                    fulfillment.productId = new ObjectId(poInternal.productId);
                                    fulfillment.purchaseOrderId = new ObjectId(poInternal.poId);
                                    fulfillment.purchaseOrderNo = poInternal.poNo;
                                    fulfillment.roNo = poInternal.roNo;
                                    fulfillment.purchaseRequestRefNo = poInternal.prRefNo;
                                }
                                fulfillment.deliveredQuantity = Number(fulfillment.deliveredQuantity);
                                fulfillment.purchaseOrderQuantity = Number(fulfillment.purchaseOrderQuantity);
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
            .then((realizations) => {
                return this.updatePurchaseOrder(realizations)
                    .then((purchaseOrderList) => {
                        return this.updatePurchaseOrderExternal(realizations, purchaseOrderList)
                    })
            })
            .then(() => {
                return Promise.resolve(id)
            })
    }

    _beforeUpdate(deliveryOrder) {
        return this.getSingleById(deliveryOrder._id)
            .then((oldDeliveryOrder) => {
                return this.mergeDeliveryOrder(deliveryOrder, oldDeliveryOrder)
                    .then((_deliveryOrder) => {
                        return Promise.resolve(deliveryOrder);
                    })
            })

    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((deliveryOrder) => this.getRealization(deliveryOrder))
            .then((realizations) => this.updatePurchaseRequestUpdateDO(realizations))
            .then((realizations) => {
                return this.updatePurchaseOrderUpdateDO(realizations)
                    .then((purchaseOrderList) => {
                        return this.updatePurchaseOrderExternalUpdateDO(realizations, purchaseOrderList)
                    })
            })
            .then(() => {
                return Promise.resolve(id)
            })
    }

    getRealization(deliveryOrder) {
        var realizations = deliveryOrder.items.map((doItem) => {
            return doItem.fulfillments.map((fulfillment) => {
                return {
                    deliveryOrder: deliveryOrder,
                    purchaseOrderId: fulfillment.purchaseOrderId,
                    purchaseRequestId: fulfillment.purchaseRequestId,
                    purchaseOrderExternalId: doItem.purchaseOrderExternalId,
                    productId: fulfillment.productId,
                    deliveredQuantity: Number(fulfillment.deliveredQuantity)
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
        var purchaseOrderList = [];
        map.forEach((realizations, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    purchaseOrderList.push(purchaseOrder);
                    for (var realization of realizations) {
                        var productId = realization.productId;
                        var poItem = purchaseOrder.items.find(item => item.product._id.toString() === productId.toString());
                        if (poItem) {
                            var deliveryOrder = realization.deliveryOrder;
                            var fulfillment = {
                                deliveryOrderNo: deliveryOrder.no,
                                deliveryOrderUseCustoms: deliveryOrder.useCustoms,
                                deliveryOrderDeliveredQuantity: Number(realization.deliveredQuantity),
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
                        }
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
            return Promise.resolve(purchaseOrderList);
        })
    }

    updatePurchaseOrderExternal(realizations, purchaseOrderList) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseOrderExternalId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, purchaseOrderExternalId) => {
            var job = this.purchaseOrderExternalManager.getSingleById(purchaseOrderExternalId)
                .then((purchaseOrderExternal) => {
                    for (var realization of realizations) {
                        var item = purchaseOrderExternal.items.find(item => item.prId.toString() === realization.purchaseRequestId.toString() && item.product._id.toString() === realization.productId.toString());
                        var purchaseOrder = purchaseOrderList.find(po => po._id.toString() === item.poId.toString())
                        var poItem = {};
                        if (purchaseOrder) {
                            poItem = purchaseOrder.items.find(_poItem => _poItem.purchaseOrderExternalId.toString() === purchaseOrderExternal._id.toString() && _poItem.product._id.toString() === item.product._id.toString())
                        }
                        var correctionQty = 0;
                        if (poItem) {
                            if (poItem.fulfillments) {
                                correctionQty = poItem.fulfillments
                                    .map(itemFulfillmentsPO => {
                                        if (itemFulfillmentsPO.corrections) {
                                            var cQty = itemFulfillmentsPO.corrections
                                                .map(c => {
                                                    if (c.correctionType) {
                                                        if (c.correctionType === "Koreksi Jumlah") {
                                                            return c.oldCorrectionQuantity - c.newCorrectionQuantity;
                                                        } else {
                                                            return 0;
                                                        }
                                                    } else {
                                                        return 0;
                                                    }
                                                })
                                                .reduce((prev, curr, index) => {
                                                    return prev + curr;
                                                }, 0);
                                            return cQty;
                                        } else {
                                            return 0;
                                        }
                                    })
                                    .reduce((prev, curr, index) => {
                                        return prev + curr;
                                    }, 0);
                            }
                        }
                        item.realizations = item.realizations || [];
                        item.realizations.push({ "deliveryOrderNo": realization.deliveryOrder.no, "deliveredQuantity": realization.deliveredQuantity })
                        item.isClosed = (item.realizations.map(item => item.deliveredQuantity)
                            .reduce((prev, curr, index) => {
                                return prev + curr;
                            }, 0) - correctionQty) >= item.dealQuantity
                    }

                    purchaseOrderExternal.isClosed = purchaseOrderExternal.items
                        .map((item) => item.isClosed)
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);
                    purchaseOrderExternal.status = poStatusEnum.ARRIVING;
                    return this.purchaseOrderExternalManager.update(purchaseOrderExternal);
                })
            jobs.push(job);
        });

        return Promise.all(jobs);
    }

    mergeDeliveryOrder(newDeliveryOrder, oldDeliveryOrder) {
        return this.getRealization(newDeliveryOrder)
            .then((newRealizations) => {
                return this.getRealization(oldDeliveryOrder)
                    .then((oldRealizations) => {
                        var _oldRealizations = [];
                        var _newRealizations = [];
                        for (var oldRealization of oldRealizations) {
                            var realization = newRealizations.find(item =>
                                item.purchaseOrderId.toString() === oldRealization.purchaseOrderId.toString() &&
                                item.purchaseRequestId.toString() === oldRealization.purchaseRequestId.toString() &&
                                item.purchaseOrderExternalId.toString() === oldRealization.purchaseOrderExternalId.toString() &&
                                item.productId.toString() === oldRealization.productId.toString());

                            if (!realization) {
                                _oldRealizations.push(oldRealization);
                            }
                        }

                        for (var newRealization of newRealizations) {
                            var realization = oldRealizations.find(item =>
                                item.purchaseOrderId.toString() === newRealization.purchaseOrderId.toString() &&
                                item.purchaseRequestId.toString() === newRealization.purchaseRequestId.toString() &&
                                item.purchaseOrderExternalId.toString() === newRealization.purchaseOrderExternalId.toString() &&
                                item.productId.toString() === newRealization.productId.toString());

                            if (!realization) {
                                _newRealizations.push(newRealization);
                            }
                        }
                        var jobs = [];
                        if (_oldRealizations.length > 0) {
                            var job = this.updatePurchaseRequestDeleteDO(_oldRealizations)
                                .then((_oldRealizations) => this.updatePurchaseOrderDeleteDO(_oldRealizations))
                                .then((_oldRealizations) => this.updatePurchaseOrderExternalDeleteDO(_oldRealizations))
                                .then(() => {
                                    return Promise.resolve(newDeliveryOrder);
                                });
                            jobs.push(job)
                        }

                        if (_newRealizations.length > 0) {
                            var job = this.updatePurchaseRequest(_newRealizations)
                                .then((_newRealizations) => this.updatePurchaseOrder(_newRealizations))
                                .then((purchaseOrderLists) => {
                                    return this.updatePurchaseOrderExternal(_newRealizations, purchaseOrderLists)
                                })
                                .then(() => {
                                    return Promise.resolve(newDeliveryOrder);
                                });
                            jobs.push(job)
                        }

                        if (jobs.length == 0) {
                            jobs.push(Promise.resolve(null));
                        }
                        return Promise.all(jobs);
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
                var purchaseOrderList = [];
                map.forEach((realizations, purchaseOrderId) => {
                    var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                        .then((purchaseOrder) => {
                            purchaseOrderList.push(purchaseOrder);
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
                                            poItem.fulfillments[index].deliveryOrderUseCustoms = deliveryOrder.useCustoms;
                                            poItem.fulfillments[index].deliveryOrderDeliveredQuantity = Number(realization.deliveredQuantity);
                                            poItem.fulfillments[index].deliveryOrderDate = deliveryOrder.date;
                                            poItem.fulfillments[index].supplierDoDate = deliveryOrder.supplierDoDate;
                                        } else {
                                            var fulfillment = {
                                                deliveryOrderNo: deliveryOrder.no,
                                                deliveryOrderUseCustoms: deliveryOrder.useCustoms,
                                                deliveryOrderDeliveredQuantity: Number(realization.deliveredQuantity),
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
                                }
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
                    return Promise.resolve(purchaseOrderList);
                })
            })
    }

    updatePurchaseOrderExternalUpdateDO(realizations, purchaseOrderList) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseOrderExternalId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, purchaseOrderExternalId) => {
            var job = this.purchaseOrderExternalManager.getSingleById(purchaseOrderExternalId)
                .then((purchaseOrderExternal) => {
                    for (var realization of realizations) {
                        var item = purchaseOrderExternal.items.find(item => item.prId.toString() === realization.purchaseRequestId.toString() && item.product._id.toString() === realization.productId.toString());
                        var index = item.realizations.find(_realization => realization.deliveryOrderNo === realization.deliveryOrderNo)
                        if (index !== -1) {
                            item.realizations[index] = { "deliveryOrderNo": realization.deliveryOrder.no, "deliveredQuantity": realization.deliveredQuantity };
                        }
                        var purchaseOrder = purchaseOrderList.find(po => po._id.toString() === item.poId.toString())
                        var poItem = {};
                        if (purchaseOrder) {
                            poItem = purchaseOrder.items.find(_poItem => _poItem.purchaseOrderExternalId.toString() === purchaseOrderExternal._id.toString() && _poItem.product._id.toString() === item.product._id.toString())
                        }
                        var correctionQty = 0;
                        if (poItem) {
                            if (poItem.fulfillments) {
                                correctionQty = poItem.fulfillments
                                    .map(itemFulfillmentsPO => {
                                        if (itemFulfillmentsPO.corrections) {
                                            var cQty = itemFulfillmentsPO.corrections
                                                .map(c => {
                                                    if (c.correctionType) {
                                                        if (c.correctionType === "Koreksi Jumlah") {
                                                            return c.oldCorrectionQuantity - c.newCorrectionQuantity;
                                                        } else {
                                                            return 0;
                                                        }
                                                    } else {
                                                        return 0;
                                                    }
                                                })
                                                .reduce((prev, curr, index) => {
                                                    return prev + curr;
                                                }, 0);
                                            return cQty;
                                        } else {
                                            return 0;
                                        }
                                    })
                                    .reduce((prev, curr, index) => {
                                        return prev + curr;
                                    }, 0);
                            }
                        }
                        item.isClosed = (item.realizations.map(item => item.deliveredQuantity)
                            .reduce((prev, curr, index) => {
                                return prev + curr;
                            }, 0) - correctionQty) >= item.dealQuantity
                    }

                    purchaseOrderExternal.isClosed = purchaseOrderExternal.items
                        .map((item) => item.isClosed)
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);
                    purchaseOrderExternal.status = poStatusEnum.ARRIVING;
                    return this.purchaseOrderExternalManager.update(purchaseOrderExternal);
                })
            jobs.push(job);
        });

        return Promise.all(jobs);
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
                                }
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
                    for (var realization of realizations) {
                        var item = purchaseOrderExternal.items.find(item => item.prId.toString() === realization.purchaseRequestId.toString() && item.product._id.toString() === realization.productId.toString());
                        var index = item.realizations.find(_realization => realization.deliveryOrderNo === realization.deliveryOrderNo)
                        if (index !== -1) {
                            item.realizations.splice(index, 1);
                        }
                        item.isClosed = item.realizations.map(item => item.deliveredQuantity)
                            .reduce((prev, curr, index) => {
                                return prev + curr;
                            }, 0) >= item.dealQuantity
                    }

                    purchaseOrderExternal.isClosed = purchaseOrderExternal.items
                        .map((item) => item.isClosed)
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);
                    purchaseOrderExternal.status = poStatusEnum.ORDERED;
                    return this.purchaseOrderExternalManager.update(purchaseOrderExternal);
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
                                return Promise.resolve(deliveryOrder._id)
                            })
                    })
            });
    }

    /*getDataDeliveryOrder(no, supplierId, dateFrom, dateTo, offset, createdBy) {
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
                var _dateFrom = new Date(dateFrom);
                var _dateTo = new Date(dateTo);
                _dateFrom.setHours(_dateFrom.getHours() - offset);
                _dateTo.setHours(_dateTo.getHours() - offset);

                var supplierDoDate = {
                    supplierDoDate: {
                        $gte: _dateFrom,
                        $lte: _dateTo
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
    }*/

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
        var createdDateIndex = {
            name: `ix_${map.purchasing.collection.DeliveryOrder}__createdDate`,
            key: {
                _createdDate: -1
            }
        }

        return this.collection.createIndexes([dateIndex, refNoIndex, createdDateIndex]);
    }

    /*getAllData(filter) {
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
    }*/

  getAllData(startdate, enddate, offset) {
        return new Promise((resolve, reject) => {

            var now = new Date();
            var deleted = {
                _deleted: false
            };

            var query = [deleted];

            var hasCustoms = {
                "hasCustoms":true
            };

            var query = [hasCustoms];
            
            var useCustoms = {
                "useCustoms":true
            };

            var query = [useCustoms];
            
            var validStartDate = new Date(startdate);
            var validEndDate = new Date(enddate);

            if (startdate && enddate) {
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
                var filterDate = {
                    "_createdDate": {
                        $gte: validStartDate,
                        $lte: validEndDate
                    }
                };
                query.push(filterDate);
            }
            else if (!startdate && enddate) {
                validEndDate.setHours(validEndDate.getHours() - offset);
                var filterDateTo = {
                    "_createdDate": {
                        $gte: now,
                        $lte: validEndDate
                    }
                };
                query.push(filterDateTo);
            }
            else if (startdate && !enddate) {
                validStartDate.setHours(validStartDate.getHours() - offset);
                var filterDateFrom = {
                    "_createdDate": {
                        $gte: validStartDate,
                        $lte: now
                    }
                };
                query.push(filterDateFrom);
            }

            var match = { "$and": query };

            this.collection.aggregate([
                { $match: match },
                { $unwind: "$items" },
                { $unwind: "$items.fulfillments" },
                {
                    $project: {
                        "NoSJ": "$no",
                        "TgSJ": "$supplierDoDate",
                        "TgDtg": "$date",
                        "KdSpl": "$supplier.code",
                        "NmSpl": "$supplier.name",
                        "SJDesc": "$remark",
                        "TipeSJ": "$shipmentType",
                        "NoKirim": "$shipmentNo",
                        "PunyaInv": "$hasInvoice",
                        "CekBon": "$isClosed",
                        "POID": "$items.fulfillments.purchaseRequestRefNo",
                        "PlanPO": "$items.fulfillments.purchaseRequestRefNo",
                        "QtyDtg": "$items.fulfillments.deliveredQuantity",
                        "SatDtg": "$items.fulfillments.purchaseOrderUom.unit",
                        "SatKnv": "$items.fulfillments.uomConversion.unit",
                        "Konversi": "$items.fulfillments.conversion",
                        "Tempo": "$items.paymentDueDays",
                        "MtUang": "$items.fulfillments.currency.code",
                        "Rate": "$items.fulfillments.currency.rate",
                        "UserIn": "$_createdBy",
                        "TgIn": "$_createdDate",
                        "UserEd": "$_updatedBy",
                        "TgEd": "$_updatedDate"
                    }
                },
                {
                    $project: {
                        "NoSJ": "$NoSJ", "TgSJ": "$TgSJ", "TgDtg": "$TgDtg", "KdSpl": "$KdSpl", "NmSpl": "$NmSpl",
                        "SJDesc": "$SJDesc", "TipeSJ": "$TipeSJ", "NoKirim": "$NoKirim", "PunyaInv": "$PunyaInv",
                        "CekBon": "$CekBon", "POID": "$POID", "PlanPO": "$PlanPO", "QtyDtg": "$QtyDtg", "SatDtg": "$SatDtg",
                        "SatKnv": "$SatKnv", "Konversi": "$Konversi", "Tempo": "$Tempo", "MtUang": "$MtUang",
                        "Rate": "$Rate", "UserIn": "$UserIn", "TgIn": "$TgIn", "UserEd": "$UserEd", "TgEd": "$TgEd"
                    }
                },
                {
                    $group: {
                        _id: {
                            "NoSJ": "$NoSJ", "TgSJ": "$TgSJ", "TgDtg": "$TgDtg", "KdSpl": "$KdSpl",
                            "NmSpl": "$NmSpl", "SJDesc": "$SJDesc", "TipeSJ": "$TipeSJ", "NoKirim": "$NoKirim",
                            "PunyaInv": "$PunyaInv", "CekBon": "$CekBon", "POID": "$POID", "PlanPO": "$PlanPO",
                            "QtyDtg": "$QtyDtg", "SatDtg": "$SatDtg", "SatKnv": "$SatKnv", "Konversi": "$Konversi",
                            "Tempo": "$Tempo", "MtUang": "$MtUang", "Rate": "$Rate",
                            "UserIn": "$UserIn", "TgIn": "$TgIn", "UserEd": "$UserEd", "TgEd": "$TgEd"
                        }
                    }
                }
            ])
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    resolve(result);
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

    getMonitoringDO(info) {
        return new Promise((resolve, reject) => {
            var _defaultFilter = {
                _deleted: false
            };
            var doNoFilter = {};
            var poEksFilter = {};
            var supplierFilter = {};
            var dateFromFilter = {};
            var dateToFilter = {};
            var userFilter = {};
            var query = {};

            // var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
            // var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59")) : (new Date());
            var date = new Date();
            var dateString = moment(date).format('YYYY-MM-DD');
            var dateNow = new Date(dateString);
            var dateBefore = dateNow.setDate(dateNow.getDate() - 30);


            if (info.no && info.no != '') {
                doNoFilter = { "no": info.no };
            }

            if (info.poEksNo && info.poEksNo != '') {
                poEksFilter = { "items.purchaseOrderExternalNo": info.poEksNo };
            }

            if (info.supplierId && info.supplierId != '') {
                supplierFilter = { "supplierId": new ObjectId(info.supplierId) };
            }

            if (info.user && info.user != '') {
                userFilter = { "_createdBy": info.user };
            }

            var _dateFrom = new Date(info.dateFrom);
            var _dateTo = new Date(info.dateTo + "T23:59");
            _dateFrom.setHours(_dateFrom.getHours() - info.offset);
            _dateTo.setHours(_dateTo.getHours() - info.offset);
            var filterDate = {
                "supplierDoDate": {
                    "$gte": (!info || !info.dateFrom ? (new Date(1900, 1, 1)) : (new Date(_dateFrom))),
                    "$lte": (!info || !info.dateTo ? date : (new Date(_dateTo)))
                }
            };

            query = { '$and': [_defaultFilter, doNoFilter, supplierFilter, filterDate, userFilter, poEksFilter] };



            return this.collection
                .aggregate([
                    { "$unwind": "$items" }
                    , { "$unwind": "$items.fulfillments" }
                    , { "$match": query }
                    , {
                        "$project": {
                            "_updatedDate": -1,
                            "no": "$no",
                            "doDate": "$supplierDoDate",
                            "arrivedDate": "$date",
                            "supplier": "$supplier.name",
                            "supplierType": "$supplier.import",
                            "shipmentType": "$shipmentType",
                            "shipmentNo": "$shipmentNo",
                            "customs": "$useCustoms",
                            "poEksNo": "$items.purchaseOrderExternalNo",
                            "prNo": "$items.fulfillments.purchaseRequestNo",
                            "prRefNo": "$items.fulfillments.purchaseRequestRefNo",
                            "roNo": "$items.fulfillments.roNo",
                            "productCode": "$items.fulfillments.product.code",
                            "productName": "$items.fulfillments.product.name",
                            "qty": "$items.fulfillments.purchaseOrderQuantity",
                            "delivered": "$items.fulfillments.deliveredQuantity",
                            "price": "$items.fulfillments.pricePerDealUnit",
                            "uom": "$items.fulfillments.purchaseOrderUom.unit",
                            "currency": "$items.fulfillments.currency.description",
                            "remark": "$items.fulfillments.remark"
                        }
                    },
                    {
                        "$sort": {
                            "_updatedDate": -1
                        }
                    }
                ])
                .toArray()
                .then(results => {
                    resolve(results);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }


    getXls(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for (var _data of result.data) {
            var data = {};
            index += 1;
            data["No"] = index;
            data["Nomor Surat Jalan"] = _data.no ? _data.no : "";
            data["Tanggal Surat Jalan"] = _data.doDate ? moment(new Date(_data.doDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Tanggal Tiba"] = _data.arrivedDate ? moment(new Date(_data.arrivedDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Supplier"] = _data.supplier ? _data.supplier : '';
            data["Jenis Supplier"] = _data.supplierType ? "Import" : "Lokal";
            data["Pengiriman"] = _data.shipmentType ? _data.shipmentType : '';
            data["Nomor BL"] = _data.shipmentNo ? _data.shipmentNo : '';
            data["Dikenakan Bea Cukai"] = _data.customs ? "Ya" : "Tidak";
            data["Nomor PO Eksternal"] = _data.poEksNo;
            data["Nomor PR"] = _data.prNo;
            data["Nomor RO"] = _data.roNo;
            data["Nomor Referensi PR"] = _data.prRefNo;
            data["Kode Barang"] = _data.productCode;
            data["Nama Barang"] = _data.productName;
            data["Jumlah Dipesan"] = _data.qty;
            data["Jumlah Diterima"] = _data.delivered;
            data["Satuan"] = _data.uom;
            data["Harga"] = _data.price * _data.delivered;
            data["Mata Uang"] = _data.currency;
            data["Keterangan"] = _data.remark ? _data.remark : '';

            xls.options["No"] = "number";
            xls.options["Nomor Surat Jalan"] = "string";
            xls.options["Tanggal Surat Jalan"] = "string";
            xls.options["Tanggal Tiba"] = "string";
            xls.options["Supplier"] = "string";
            xls.options["Jenis Supplier"] = "string";
            xls.options["Pengiriman"] = "string";
            xls.options["Nomor BL"] = "string";
            xls.options["Dikenakan Bea Cukai"] = "string";
            xls.options["Nomor PO Eksternal"] = "string";
            xls.options["Nomor PR"] = "string";
            xls.options["Nomor RO"] = "string";
            xls.options["Nomor Referensi PR"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Jumlah Dipesan"] = "number";
            xls.options["Jumlah Diterima"] = "number";
            xls.options["Satuan"] = "string";
            xls.options["Harga"] = "number";
            xls.options["Mata Uang"] = "string";
            xls.options["Keterangan"] = "string";

            xls.data.push(data);

        }

        if (query.dateFrom && query.dateTo) {
            xls.name = `Monitoring Surat Jalan ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Monitoring Surat Jalan ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Monitoring Surat Jalan ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Monitoring Surat Jalan.xlsx`;

        return Promise.resolve(xls);
    }

    getMonitoringDOAll(info) {
        return new Promise((resolve, reject) => {
            var _defaultFilter = {
                _deleted: false
            };
            var doNoFilter = {};
            var poEksFilter = {};
            var supplierFilter = {};
            var dateFromFilter = {};
            var dateToFilter = {};
            // var createdByFilter = {};
            // var staffNameFilter = {};
            var userFilter = {};
            var query = {};

            // var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
            // var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59")) : (new Date());
            var date = new Date();
            var dateString = moment(date).format('YYYY-MM-DD');
            var dateNow = new Date(dateString);
            var dateBefore = dateNow.setDate(dateNow.getDate() - 30);


            if (info.no && info.no != '') {
                doNoFilter = { "no": info.no };
            }

            if (info.poEksNo && info.poEksNo != '') {
                poEksFilter = { "items.purchaseOrderExternalNo": info.poEksNo };
            }

            if (info.supplierId && info.supplierId != '') {
                supplierFilter = { "supplierId": new ObjectId(info.supplierId) };
            }

            if (info.user && info.user != '') {
                userFilter = { "_createdBy": info.user };
            }

            var _dateFrom = new Date(info.dateFrom);
            var _dateTo = new Date(info.dateTo + "T23:59");
            _dateFrom.setHours(_dateFrom.getHours() - info.offset);
            _dateTo.setHours(_dateTo.getHours() - info.offset);
            var filterDate = {
                "supplierDoDate": {
                    "$gte": (!info || !info.dateFrom ? (new Date(1900, 1, 1)) : (new Date(_dateFrom))),
                    "$lte": (!info || !info.dateTo ? date : (new Date(_dateTo)))
                }
            };

            query = { '$and': [_defaultFilter, doNoFilter, supplierFilter, filterDate, userFilter, poEksFilter] };

            return this.collection
                .aggregate([
                    { "$unwind": "$items" }
                    , { "$unwind": "$items.fulfillments" }
                    , { "$match": query }
                    , {
                        "$project": {
                            "_updatedDate": -1,
                            "no": "$no",
                            "doDate": "$supplierDoDate",
                            "arrivedDate": "$date",
                            "supplier": "$supplier.name",
                            "supplierType": "$supplier.import",
                            "shipmentType": "$shipmentType",
                            "shipmentNo": "$shipmentNo",
                            "customs": "$useCustoms",
                            "poEksNo": "$items.purchaseOrderExternalNo",
                            "prNo": "$items.fulfillments.purchaseRequestNo",
                            "prRefNo": "$items.fulfillments.purchaseRequestRefNo",
                            "roNo": "$items.fulfillments.roNo",
                            "productCode": "$items.fulfillments.product.code",
                            "productName": "$items.fulfillments.product.name",
                            "qty": "$items.fulfillments.purchaseOrderQuantity",
                            "delivered": "$items.fulfillments.deliveredQuantity",
                            "price": "$items.fulfillments.pricePerDealUnit",
                            "uom": "$items.fulfillments.purchaseOrderUom.unit",
                            "currency": "$items.fulfillments.currency.description",
                            "remark": "$items.fulfillments.remark",
                            "_createdBy": "$_createdBy"
                        }
                    },
                    {
                        "$sort": {
                            "_updatedDate": -1
                        }
                    }
                ])
                .toArray()
                .then(results => {
                    resolve(results);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }


    getXlsMonitoringDOAll(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for (var _data of result.data) {
            var data = {};
            index += 1;
            data["No"] = index;
            data["Nomor Surat Jalan"] = _data.no ? _data.no : "";
            data["Tanggal Surat Jalan"] = _data.doDate ? moment(new Date(_data.doDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Tanggal Tiba"] = _data.arrivedDate ? moment(new Date(_data.arrivedDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Supplier"] = _data.supplier ? _data.supplier : '';
            data["Jenis Supplier"] = _data.supplierType ? "Import" : "Lokal";
            data["Pengiriman"] = _data.shipmentType ? _data.shipmentType : '';
            data["Nomor BL"] = _data.shipmentNo ? _data.shipmentNo : '';
            data["Dikenakan Bea Cukai"] = _data.customs ? "Ya" : "Tidak";
            data["Nomor PO Eksternal"] = _data.poEksNo;
            data["Nomor PR"] = _data.prNo;
            data["Nomor RO"] = _data.roNo;
            data["Nomor Referensi PR"] = _data.prRefNo;
            data["Kode Barang"] = _data.productCode;
            data["Nama Barang"] = _data.productName;
            data["Jumlah Dipesan"] = _data.qty;
            data["Jumlah Diterima"] = _data.delivered;
            data["Satuan"] = _data.uom;
            data["Harga"] = _data.price * _data.delivered;
            data["Mata Uang"] = _data.currency;
            data["Keterangan"] = _data.remark ? _data.remark : '';
            data["Staff Pembelian"] = _data._createdBy ? _data._createdBy : '';

            xls.options["No"] = "number";
            xls.options["Nomor Surat Jalan"] = "string";
            xls.options["Tanggal Surat Jalan"] = "string";
            xls.options["Tanggal Tiba"] = "string";
            xls.options["Supplier"] = "string";
            xls.options["Jenis Supplier"] = "string";
            xls.options["Pengiriman"] = "string";
            xls.options["Nomor BL"] = "string";
            xls.options["Dikenakan Bea Cukai"] = "string";
            xls.options["Nomor PO Eksternal"] = "string";
            xls.options["Nomor PR"] = "string";
            xls.options["Nomor RO"] = "string";
            xls.options["Nomor Referensi PR"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Jumlah Dipesan"] = "number";
            xls.options["Jumlah Diterima"] = "number";
            xls.options["Satuan"] = "string";
            xls.options["Harga"] = "number";
            xls.options["Mata Uang"] = "string";
            xls.options["Keterangan"] = "string";
            xls.options["Staff Pembelian"] = "string";

            xls.data.push(data);

        }

        if (query.dateFrom && query.dateTo) {
            xls.name = `Monitoring Surat Jalan All User ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Monitoring Surat Jalan All User ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Monitoring Surat Jalan All User ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Monitoring Surat Jalan All User.xlsx`;

        return Promise.resolve(xls);
    }
};
