'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var UnitReceiptNote = DLModels.garmentPurchasing.GarmentUnitReceiptNote;
var PurchaseOrderManager = require('./purchase-order-manager');
var DeliveryOrderManager = require('./delivery-order-manager');
var UnitManager = require('../master/unit-manager');
var SupplierManager = require('../master/garment-supplier-manager');
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;

module.exports = class UnitReceiptNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentUnitReceiptNote);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.unitManager = new UnitManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
    }

    _validate(unitReceiptNote) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = unitReceiptNote;

            var getUnitReceiptNotePromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    "no": valid.no
                }, {
                    _deleted: false
                }]
            });

            var getDeliveryOrder = valid.deliveryOrderId && ObjectId.isValid(valid.deliveryOrderId) ? this.deliveryOrderManager.getSingleByIdOrDefault(valid.deliveryOrderId) : Promise.resolve(null);
            var getUnit = valid.unit && ObjectId.isValid(valid.unit._id) ? this.unitManager.getSingleByIdOrDefault(valid.unit._id) : Promise.resolve(null);
            var getSupplier = valid.supplier && ObjectId.isValid(valid.supplier._id) ? this.supplierManager.getSingleByIdOrDefault(valid.supplier._id) : Promise.resolve(null);

            valid.items = valid.items || [];
            var _purchaseOrders = valid.items.map((item) => {
                return item.purchaseOrderId
            });
            _purchaseOrders = [].concat.apply([], _purchaseOrders);

            var _listPurchaseOrderIds = _purchaseOrders.filter(function (elem, index, self) {
                return index == self.indexOf(elem);
            })

            var getPurchaseOrder = _listPurchaseOrderIds.map((purchaseOrderId) => {
                if (ObjectId.isValid(purchaseOrderId)) {
                    return this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrderId)
                } else {
                    return Promise.resolve(null)
                }
            });

            Promise.all([getUnitReceiptNotePromise, getDeliveryOrder, getUnit, getSupplier].concat(getPurchaseOrder))
                .then(results => {
                    var _unitReceiptNote = results[0];
                    var _deliveryOrder = results[1];
                    var _unit = results[2];
                    var _supplier = results[3];
                    var _purchaseOrderList = results.slice(4, results.length) || [];
                    var now = new Date();

                    if (_unitReceiptNote)
                        errors["no"] = i18n.__("UnitReceiptNote.no.isExists:%s is already exists", i18n.__("UnitReceiptNote.no._:No")); //"No. bon unit sudah terdaftar";

                    if (valid.unit) {
                        if (!valid.unit._id)
                            errors["unit"] = i18n.__("UnitReceiptNote.unit.isRequired:%s is required", i18n.__("UnitReceiptNote.unit._:Unit")); //"Unit tidak boleh kosong";
                    }
                    else if (!valid.unit)
                        errors["unit"] = i18n.__("UnitReceiptNote.unit.isRequired:%s is required", i18n.__("UnitReceiptNote.unit._:Unit")); //"Unit tidak boleh kosong";
                    else if (!_unit)
                        errors["unit"] = i18n.__("UnitReceiptNote.unit.isRequired:%s is required", i18n.__("UnitReceiptNote.unit._:Unit")); //"Unit tidak boleh kosong";

                    if (valid.supplier) {
                        if (!valid.supplier._id)
                            errors["supplier"] = i18n.__("UnitReceiptNote.supplier.isRequired:%s name is required", i18n.__("UnitReceiptNote.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    }
                    else if (!valid.supplier)
                        errors["supplier"] = i18n.__("UnitReceiptNote.supplier.isRequired:%s name is required", i18n.__("UnitReceiptNote.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    else if (!_supplier)
                        errors["supplier"] = i18n.__("UnitReceiptNote.supplier.isRequired:%s name  is required", i18n.__("UnitReceiptNote.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";

                    if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("UnitReceiptNote.date.isRequired:%s is required", i18n.__("UnitReceiptNote.date._:Date")); //"Tanggal tidak boleh kosong";
                    else if (new Date(valid.date) > now) {
                        errors["date"] = i18n.__("UnitReceiptNote.date.isGreater:%s is greater than today", i18n.__("UnitReceiptNote.date._:Date"));//"Tanggal tidak boleh lebih besar dari tanggal hari ini";
                    }

                    if (!_deliveryOrder)
                        errors["deliveryOrderId"] = i18n.__("UnitReceiptNote.deliveryOrder.isRequired:%s is required", i18n.__("UnitReceiptNote.deliveryOrder._:Delivery Order No.")); //"No. surat jalan tidak boleh kosong";
                    else if (!valid.deliveryOrderId)
                        errors["deliveryOrderId"] = i18n.__("UnitReceiptNote.deliveryOrder.isRequired:%s is required", i18n.__("UnitReceiptNote.deliveryOrder._:Delivery Order No")); //"No. surat jalan tidak boleh kosong";
                    else {
                        if (!valid.deliveryOrderId)
                            errors["deliveryOrderId"] = i18n.__("UnitReceiptNote.deliveryOrder.isRequired:%s is required", i18n.__("UnitReceiptNote.deliveryOrder._:Delivery Order No")); //"No. surat jalan tidak boleh kosong";
                        var doDate = new Date(_deliveryOrder.date);
                        var validDate = new Date(valid.date);
                        if (validDate < doDate)
                            errors["date"] = i18n.__("UnitReceiptNote.date.isGreater:%s is less than delivery order date", i18n.__("UnitReceiptNote.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                    }
                    if (valid.items) {
                        if (valid.items.length <= 0) {
                            errors.items = [];
                            errors.items.push({ "productId": i18n.__("UnitReceiptNote.items.product.isRequired:%s is required", i18n.__("UnitReceiptNote.items.product._:Product")) }); //"Harus ada minimal 1 barang";
                        }
                        else {
                            var itemErrors = [];
                            for (var item of valid.items) {
                                var itemError = {};
                                var _deliveredQuantities = _deliveryOrder.items.map(doitem => {
                                    return doitem.fulfillments.map(fulfillment => {
                                        if (fulfillment.purchaseOrderId.toString() === item.purchaseOrderId.toString() && fulfillment.product._id.toString() === item.product._id.toString()) {
                                            return fulfillment.deliveredQuantity;
                                        }
                                    })
                                });
                                _deliveredQuantities = [].concat.apply([], _deliveredQuantities);
                                _deliveredQuantities = this.cleanUp(_deliveredQuantities);
                                var _deliveredQuantity = _deliveredQuantities[0] || 0;
                                if (item.deliveredQuantity <= 0)
                                    itemError["deliveredQuantity"] = i18n.__("UnitReceiptNote.items.deliveredQuantity.isRequired:%s is required", i18n.__("UnitReceiptNote.items.deliveredQuantity._:Delivered Quantity")); //Jumlah barang tidak boleh kosong";
                                else if (item.deliveredQuantity > _deliveredQuantity)
                                    itemError["deliveredQuantity"] = i18n.__("UnitReceiptNote.items.deliveredQuantity.isRequired:%s must not be greater than delivered quantity on delivery order", i18n.__("UnitReceiptNote.items.deliveredQuantity._:Delivered Quantity")); //Jumlah barang tidak boleh kosong";
                                itemErrors.push(itemError);
                            }
                            for (var itemError of itemErrors) {
                                if (Object.getOwnPropertyNames(itemError).length > 0) {
                                    errors.items = itemErrors;
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        errors.items = [];
                        errors.items.push({ "productId": i18n.__("UnitReceiptNote.items.product.isRequired:%s is required", i18n.__("UnitReceiptNote.items.product._:Product")) }); //"Harus ada minimal 1 barang";
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.unitId = new ObjectId(_unit._id);
                    valid.unit = _unit;
                    valid.supplierId = new ObjectId(_supplier._id);
                    valid.supplier = _supplier;
                    valid.deliveryOrderId = new ObjectId(_deliveryOrder._id);
                    valid.deliveryOrderNo = _deliveryOrder.no;
                    valid.date = new Date(valid.date);

                    for (var item of valid.items) {
                        // var _purchaseOrder = _purchaseOrderList.find((poInternal) => poInternal._id.toString() === item.purchaseOrderId.toString())
                        // var _purchaseOrderItem = _purchaseOrder.items.find((item) => item.product._id.toString() === item.product._id.toString())
                        // item.product = _purchaseOrderItem.product;
                        // item.deliveredUom = _purchaseOrderItem.dealUom;
                        // item.currency = _purchaseOrderItem.currency;
                        // item.category = _purchaseOrderItem.category;
                        // item.categoryId = new ObjectId(item.categoryId);
                        // item.purchaseOrderId = new ObjectId(item.purchaseOrderId);
                        // item.purchaseRequestId = new ObjectId(item.purchaseRequestId);
                        item.deliveredQuantity = Number(item.deliveredQuantity);
                        item.purchaseOrderQuantity = Number(item.purchaseOrderQuantity);
                        item.pricePerDealUnit = Number(item.pricePerDealUnit);
                    }

                    if (!valid.stamp)
                        valid = new UnitReceiptNote(valid);

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
            _deleted: false
        }, keywordFilter = {};

        var query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterNo = {
                'no': {
                    '$regex': regex
                }
            };

            var filterSupplierName = {
                'supplier.name': {
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

            var filterDeliveryOrder = {
                "deliveryOrderNo": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplierName, filterUnitDivision, filterUnitSubDivision, filterDeliveryOrder]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    _beforeInsert(unitReceiptNote) {
        unitReceiptNote.no = generateCode();
        return Promise.resolve(unitReceiptNote);
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((unitReceiptNote) => this.updatePurchaseOrder(unitReceiptNote))
            .then((unitReceiptNote) => this.updateDeliveryOrder(unitReceiptNote))
            .then(() => {
                return id;
            })
    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((unitReceiptNote) => this.updatePurchaseOrderUpdateUnitReceiptNote(unitReceiptNote))
            .then((unitReceiptNote) => this.updateDeliveryOrderUpdateUnitReceiptNote(unitReceiptNote))
            .then(() => {
                return id;
            })
    }

    updatePurchaseOrder(unitReceiptNote) {
        var map = new Map();
        for (var item of unitReceiptNote.items) {
            var key = item.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            var item = {
                productId: item.product._id,
                deliveredQuantity: item.deliveredQuantity,
                deliveredUom: item.deliveredUom
            };
            map.get(key).push(item);
        }

        var jobs = [];
        map.forEach((items, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    for (var item of items) {
                        var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === item.productId.toString());
                        if (poItem) {
                            var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.deliveryOrderNo.toString() === unitReceiptNote.deliveryOrderNo.toString());
                            if (fulfillment) {
                                if (!fulfillment.hasOwnProperty("unitReceiptNoteNo")) {
                                    fulfillment.unitReceiptNoteNo = unitReceiptNote.no;
                                    fulfillment.unitReceiptNoteDate = unitReceiptNote.date;
                                    fulfillment.unitReceiptNoteDeliveredQuantity = Number(item.deliveredQuantity);
                                    fulfillment.unitReceiptDeliveredUom = item.deliveredUom;
                                } else {
                                    var _fulfillment = Object.assign({}, fulfillment);
                                    _fulfillment.unitReceiptNoteNo = unitReceiptNote.no;
                                    _fulfillment.unitReceiptNoteDate = unitReceiptNote.date;
                                    _fulfillment.unitReceiptNoteDeliveredQuantity = Number(item.deliveredQuantity);
                                    _fulfillment.unitReceiptDeliveredUom = item.deliveredUom;
                                    poItem.fulfillments.push(_fulfillment);
                                }
                            }
                        }
                    }
                    var totalReceived = purchaseOrder.items
                        .map(poItem => {
                            var total = poItem.fulfillments
                                .map(fulfillment => fulfillment.unitReceiptNoteDeliveredQuantity)
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);
                            return total;
                        })
                        .reduce((prev, curr, index) => {
                            return prev + curr;
                        }, 0);

                    var totalDealQuantity = purchaseOrder.items
                        .map(poItem => poItem.dealQuantity)
                        .reduce((prev, curr, index) => {
                            return prev + curr;
                        }, 0);

                    if (purchaseOrder.status.value <= 7) {
                        purchaseOrder.status = totalReceived === totalDealQuantity ? poStatusEnum.RECEIVED : poStatusEnum.RECEIVING;
                    }
                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(unitReceiptNote);
        })
    }

    updatePurchaseOrderUpdateUnitReceiptNote(unitReceiptNote) {
        var map = new Map();
        for (var item of unitReceiptNote.items) {
            var key = item.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            var item = {
                productId: item.product._id,
                deliveredQuantity: item.deliveredQuantity,
                deliveredUom: item.deliveredUom
            };
            map.get(key).push(item);
        }

        var jobs = [];
        map.forEach((items, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    for (var item of items) {
                        var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === item.productId.toString());
                        if (poItem) {
                            var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.deliveryOrderNo.toString() === unitReceiptNote.deliveryOrderNo.toString() && fulfillment.unitReceiptNoteNo === unitReceiptNote.no);
                            if (fulfillment) {
                                fulfillment.unitReceiptNoteNo = unitReceiptNote.no;
                                fulfillment.unitReceiptNoteDate = unitReceiptNote.date;
                                fulfillment.unitReceiptNoteDeliveredQuantity = Number(item.deliveredQuantity);
                                fulfillment.unitReceiptDeliveredUom = item.deliveredUom;
                            }
                        }
                    }
                    var totalReceived = purchaseOrder.items
                        .map(poItem => {
                            var total = poItem.fulfillments
                                .map(fulfillment => fulfillment.unitReceiptNoteDeliveredQuantity)
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);
                            return total;
                        })
                        .reduce((prev, curr, index) => {
                            return prev + curr;
                        }, 0);

                    var totalDealQuantity = purchaseOrder.items
                        .map(poItem => poItem.dealQuantity)
                        .reduce((prev, curr, index) => {
                            return prev + curr;
                        }, 0);

                    if (purchaseOrder.status.value <= 7) {
                        purchaseOrder.status = totalReceived === totalDealQuantity ? poStatusEnum.RECEIVED : poStatusEnum.RECEIVING;
                    }
                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(unitReceiptNote);
        })
    }

    updatePurchaseOrderDeleteUnitReceiptNote(unitReceiptNote) {
        var map = new Map();
        for (var item of unitReceiptNote.items) {
            var key = item.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            var item = {
                productId: item.product._id,
                deliveredQuantity: item.deliveredQuantity,
                deliveredUom: item.deliveredUom
            };
            map.get(key).push(item);
        }

        this.deliveryOrderManager.getSingleById(unitReceiptNote.deliveryOrderId, ["isClosed"])
            .then((deliveryOrder) => {
                var jobs = [];
                map.forEach((items, purchaseOrderId) => {
                    var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                        .then((purchaseOrder) => {
                            for (var item of items) {
                                var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === item.productId.toString());
                                if (poItem) {
                                    var listDo = poItem.fulfillments
                                        .map((fulfillment) => {
                                            if (fulfillment.deliveryOrderNo.toString() === unitReceiptNote.deliveryOrderNo.toString()) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        })
                                        .reduce((prev, curr, index) => {
                                            return prev + curr;
                                        }, 0);

                                    var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.deliveryOrderNo.toString() === unitReceiptNote.deliveryOrderNo.toString() && fulfillment.unitReceiptNoteNo === unitReceiptNote.no);
                                    if (fulfillment) {
                                        if (listDo > 1) {
                                            var index = poItem.fulfillments.indexOf(fulfillment);
                                            poItem.fulfillments.splice(index, 1);
                                        } else {
                                            delete fulfillment.unitReceiptNoteNo;
                                            delete fulfillment.unitReceiptNoteDate;
                                            delete fulfillment.unitReceiptNoteDeliveredQuantity;
                                            delete fulfillment.unitReceiptDeliveredUom;
                                        }
                                    }
                                }
                            }

                            var poStatus = purchaseOrder.items
                                .map((item) => {
                                    return item.fulfillments
                                        .map((fulfillment) => fulfillment.hasOwnProperty("unitReceiptNoteNo"))
                                        .reduce((prev, curr, index) => {
                                            return prev || curr
                                        }, false);
                                })
                                .reduce((prev, curr, index) => {
                                    return prev || curr
                                }, false);
                            if (purchaseOrder.status.value <= 7) {
                                purchaseOrder.status = poStatus ? poStatusEnum.RECEIVING : (deliveryOrder.isClosed ? poStatusEnum.ARRIVED : poStatusEnum.ARRIVING);
                            } return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                        })
                    jobs.push(job);
                })

                return Promise.all(jobs).then((results) => {
                    return Promise.resolve(unitReceiptNote);
                })

            })
    }

    updateDeliveryOrder(unitReceiptNote) {
        return this.deliveryOrderManager.getSingleByQueryOrDefault({ _id: ObjectId.isValid(unitReceiptNote.deliveryOrderId) ? new ObjectId(unitReceiptNote.deliveryOrderId) : {} })
            .then((deliveryOrder) => {
                var map = new Map();
                for (var item of unitReceiptNote.items) {
                    var key = item.purchaseOrderId.toString();
                    if (!map.has(key))
                        map.set(key, [])
                    var item = {
                        productId: item.product._id,
                        deliveredQuantity: item.deliveredQuantity,
                        deliveredUom: item.deliveredUom
                    };
                    map.get(key).push(item);
                }

                map.forEach((items, purchaseOrderId) => {
                    for (var _item of items) {
                        for (var item of deliveryOrder.items) {
                            var fulfillment = item.fulfillments.find(fulfillment => fulfillment.purchaseOrderId.toString() === purchaseOrderId.toString() && fulfillment.product._id.toString() === _item.productId.toString());
                            if (fulfillment) {
                                var _realizationQuantity = {
                                    no: unitReceiptNote.no,
                                    deliveredQuantity: Number(_item.deliveredQuantity)
                                }
                                fulfillment.realizationQuantity.push(_realizationQuantity);
                            }
                        }
                    }
                })

                for (var item of deliveryOrder.items) {
                    item.isClosed = item.fulfillments
                        .map((fulfillment) => {
                            var total = fulfillment.realizationQuantity
                                .map(realizationQty => realizationQty.deliveredQuantity)
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);
                            return fulfillment.deliveredQuantity === total
                        })
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);
                }

                deliveryOrder.isClosed = deliveryOrder.items
                    .map((item) => item.isClosed)
                    .reduce((prev, curr, index) => {
                        return prev && curr
                    }, true);

                return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder)
                    .then((results) => {
                        return Promise.resolve(unitReceiptNote);
                    })
            })
    }

    updateDeliveryOrderUpdateUnitReceiptNote(unitReceiptNote) {
        return this.deliveryOrderManager.getSingleByQueryOrDefault({ _id: ObjectId.isValid(unitReceiptNote.deliveryOrderId) ? new ObjectId(unitReceiptNote.deliveryOrderId) : {} })
            .then((deliveryOrder) => {
                var map = new Map();
                for (var item of unitReceiptNote.items) {
                    var key = item.purchaseOrderId.toString();
                    if (!map.has(key))
                        map.set(key, [])
                    var item = {
                        productId: item.product._id,
                        deliveredQuantity: item.deliveredQuantity,
                        deliveredUom: item.deliveredUom
                    };
                    map.get(key).push(item);
                }

                map.forEach((items, purchaseOrderId) => {
                    for (var _item of items) {
                        for (var item of deliveryOrder.items) {
                            var fulfillment = item.fulfillments.find(fulfillment => fulfillment.purchaseOrderId.toString() === purchaseOrderId.toString() && fulfillment.product._id.toString() === _item.productId.toString());
                            if (fulfillment) {
                                var _realizationQuantity = fulfillment.realizationQuantity.find(realqty => realqty.no === unitReceiptNote.no);
                                if (_realizationQuantity) {
                                    _realizationQuantity.no = unitReceiptNote.no;
                                    _realizationQuantity.deliveredQuantity = Number(_item.deliveredQuantity);
                                } else {
                                    var _realizationQuantity = {
                                        no: unitReceiptNote.no,
                                        deliveredQuantity: Number(_item.deliveredQuantity)
                                    }
                                    fulfillment.realizationQuantity.push(_realizationQuantity);
                                }
                            }
                        }
                    }
                })

                for (var item of deliveryOrder.items) {
                    item.isClosed = item.fulfillments
                        .map((fulfillment) => {
                            var total = fulfillment.realizationQuantity
                                .map(realizationQty => realizationQty.deliveredQuantity)
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);
                            return fulfillment.deliveredQuantity === total
                        })
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);
                }

                deliveryOrder.isClosed = deliveryOrder.items
                    .map((item) => item.isClosed)
                    .reduce((prev, curr, index) => {
                        return prev && curr
                    }, true);

                return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder)
                    .then((results) => {
                        return Promise.resolve(unitReceiptNote);
                    })
            })
    }

    updateDeliveryOrderDeleteUnitReceiptNote(unitReceiptNote) {
        return this.deliveryOrderManager.getSingleByQueryOrDefault({ _id: ObjectId.isValid(unitReceiptNote.deliveryOrderId) ? new ObjectId(unitReceiptNote.deliveryOrderId) : {} })
            .then((deliveryOrder) => {
                var map = new Map();
                for (var item of unitReceiptNote.items) {
                    var key = item.purchaseOrderId.toString();
                    if (!map.has(key))
                        map.set(key, [])
                    var item = {
                        productId: item.product._id,
                        deliveredQuantity: item.deliveredQuantity,
                        deliveredUom: item.deliveredUom
                    };
                    map.get(key).push(item);
                }

                map.forEach((items, purchaseOrderId) => {
                    for (var _item of items) {
                        for (var item of deliveryOrder.items) {
                            var fulfillment = item.fulfillments.find(fulfillment => fulfillment.purchaseOrderId.toString() === purchaseOrderId.toString() && fulfillment.product._id.toString() === _item.productId.toString());
                            if (fulfillment) {
                                var _realizationQuantity = fulfillment.realizationQuantity.find(realqty => realqty.no === unitReceiptNote.no);
                                var _index = fulfillment.realizationQuantity.indexOf(_realizationQuantity);
                                fulfillment.realizationQuantity.splice(_index, 1);
                            }
                        }
                    }
                })

                for (var item of deliveryOrder.items) {
                    item.isClosed = item.fulfillments
                        .map((fulfillment) => {
                            var total = fulfillment.realizationQuantity
                                .map(realizationQty => realizationQty.deliveredQuantity)
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);
                            return fulfillment.deliveredQuantity === total
                        })
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);
                }

                deliveryOrder.isClosed = deliveryOrder.items
                    .map((item) => item.isClosed)
                    .reduce((prev, curr, index) => {
                        return prev && curr
                    }, true);

                return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder)
                    .then((results) => {
                        return Promise.resolve(unitReceiptNote);
                    })
            })
    }

    delete(unitReceiptNote) {
        return this._pre(unitReceiptNote)
            .then((validData) => {
                validData._deleted = true;
                return this.collection.update(validData)
                    .then((id) => {
                        var query = {
                            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
                        };
                        return this.getSingleByQuery(query)
                            .then((unitReceiptNote) => this.updateDeliveryOrderDeleteUnitReceiptNote(unitReceiptNote))
                            .then((unitReceiptNote) => this.updatePurchaseOrderDeleteUnitReceiptNote(unitReceiptNote))
                            .then(() => {
                                return unitReceiptNote._id;
                            })
                    })
            });
    }

    pdf(id, offset) {
        return new Promise((resolve, reject) => {
            this.getSingleById(id)
                .then(unitReceiptNote => {
                    this.deliveryOrderManager.getSingleById(unitReceiptNote.deliveryOrderId, ['date'])
                        .then((deliveryOrder) => {
                            var _purchaseOrders = unitReceiptNote.items.map((item) => {
                                return item.purchaseOrderId
                            });
                            _purchaseOrders = [].concat.apply([], _purchaseOrders);

                            var _listPurchaseOrderIds = _purchaseOrders.filter(function (elem, index, self) {
                                return index == self.indexOf(elem);
                            })
                            var getPurchaseOrder = _listPurchaseOrderIds.map((purchaseOrderId) => {
                                if (ObjectId.isValid(purchaseOrderId)) {
                                    return this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrderId, ["_id", "no", "artikel", "roNo", "items.refNo"])
                                } else {
                                    return Promise.resolve(null)
                                }
                            });
                            Promise.all(getPurchaseOrder)
                                .then((listPurchaseOrder) => {
                                    unitReceiptNote.deliveryOrderDate = deliveryOrder.date;
                                    unitReceiptNote.items.map((item) => {
                                        var purchaseOrder = listPurchaseOrder.find((po) => item.purchaseOrderId.toString() === po._id.toString());
                                        item.artikel = purchaseOrder.artikel;
                                        item.roNo = purchaseOrder.roNo;
                                        item.refNo = purchaseOrder.items[0].refNo;
                                    });
                                    var getDefinition = require('../../pdf/definitions/garment-unit-receipt-note');
                                    var definition = getDefinition(unitReceiptNote, offset);
                                    var generatePdf = require('../../pdf/pdf-generator');
                                    generatePdf(definition)
                                        .then(binary => {
                                            resolve(binary);
                                        })
                                        .catch(e => {
                                            reject(e);
                                        });
                                })
                        })
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    /*getUnitReceiptNotes(_no, _unitId, _categoryId, _supplierId, _dateFrom, _dateTo, offset, createdBy) {
        return new Promise((resolve, reject) => {
            var query = Object.assign({});

            var deleted = { _deleted: false };

            if (_no !== "undefined" && _no !== "") {
                var no = { no: _no };
                Object.assign(query, no);
            }
            if (_unitId !== "undefined" && _unitId !== "") {
                var unitId = { unitId: new ObjectId(_unitId) };
                Object.assign(query, unitId);
            }
            if (_categoryId !== "undefined" && _categoryId !== "") {
                var categoryId = {
                    "items": {
                        $elemMatch: {
                            "purchaseOrder.categoryId": new ObjectId(_categoryId)
                        }
                    }
                };
                Object.assign(query, categoryId);
            }
            if (_supplierId !== "undefined" && _supplierId !== "") {
                var supplierId = { supplierId: new ObjectId(_supplierId) };
                Object.assign(query, supplierId);
            }
            if (_dateFrom !== "undefined" && _dateFrom !== "null" && _dateFrom !== "" && _dateTo !== "undefined" && _dateTo !== "null" && _dateTo !== "") {
                var dateFrom = new Date(_dateFrom);
                var dateTo = new Date(_dateTo);
                dateFrom.setHours(dateFrom.getHours() - offset);
                dateTo.setHours(dateTo.getHours() - offset);

                var date = {
                    date: {
                        $gte: dateFrom,
                        $lte: dateTo
                    }
                };
                Object.assign(query, date);
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
                .then(result => {
                    resolve(result.data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }*/

    /*getUnitReceiptWithoutSpb(_dateFrom, _dateTo) {
        return new Promise((resolve, reject) => {
            var query = Object.assign({});
            var deleted = { _deleted: false };
            var bayar = { isPaid: false };


            if (_dateFrom !== "undefined" && _dateFrom !== "null" && _dateFrom !== "" && _dateTo !== "undefined" && _dateTo !== "null" && _dateTo !== "") {
                var dateFrom = new Date(_dateFrom);
                var dateTo = new Date(_dateTo);

                var date = {
                    date: {
                        $gte: dateFrom,
                        $lte: dateTo
                    }
                };
                Object.assign(query, date);
            }

            Object.assign(query, deleted);
            Object.assign(query, bayar);


            this.collection
                .where(query)
                .execute()
                .then(result => {
                    resolve(result.data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }*/

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentUnitReceiptNote}_date`,
            key: {
                date: -1
            }
        }

        var noIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentUnitReceiptNote}_no`,
            key: {
                no: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
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
                        "unit",
                        "supplier",
                        "deliveryOrder.no",
                        "remark",
                        "_createdBy",
                        "items.product",
                        "items.deliveredQuantity",
                        "items.deliveredUom",
                        "items.remark"];

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

    updateCollectionUnitReceiptNote(unitReceiptNote) {
        if (!unitReceiptNote.stamp) {
            unitReceiptNote = new UnitReceiptNote(unitReceiptNote);
        }

        unitReceiptNote.stamp(this.user.username, 'manager');
        return this.collection
            .updateOne({
                _id: unitReceiptNote._id
            }, {
                $set: unitReceiptNote
            })
            .then((result) => Promise.resolve(unitReceiptNote._id));
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