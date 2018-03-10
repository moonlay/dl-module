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
var InternNoteManager = require('./intern-note-manager');
var UnitManager = require('../master/unit-manager');
var StorageManager = require('../master/storage-manager');
var SupplierManager = require('../master/garment-supplier-manager');
var GarmentInventoryDocumentManager = require('../inventory-garment/garment-inventory-document-manager');

var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;
var moment = require('moment');

module.exports = class UnitReceiptNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentUnitReceiptNote);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.garmentInventoryDocumentManager = new GarmentInventoryDocumentManager(db, user);
        this.internNoteManager = new InternNoteManager(db, user);
        this.unitManager = new UnitManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
        this.storageManager = new StorageManager(db, user);
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
            var getStorage = valid.storageId && ObjectId.isValid(valid.storageId) ? this.storageManager.getSingleByIdOrDefault(valid.storageId) : Promise.resolve(null);

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

            Promise.all([getUnitReceiptNotePromise, getDeliveryOrder, getUnit, getSupplier, getStorage].concat(getPurchaseOrder))
                .then(results => {
                    var _unitReceiptNote = results[0];
                    var _deliveryOrder = results[1];
                    var _unit = results[2];
                    var _supplier = results[3];
                    var _storage = results[4];
                    var _purchaseOrderList = results.slice(5, results.length) || [];
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

                    // if (!valid.date || valid.date == '')
                    //     errors["date"] = i18n.__("UnitReceiptNote.date.isRequired:%s is required", i18n.__("UnitReceiptNote.date._:Date")); //"Tanggal tidak boleh kosong";
                    // else if (new Date(valid.date) > now) {
                    //     errors["date"] = i18n.__("UnitReceiptNote.date.isGreater:%s is greater than today", i18n.__("UnitReceiptNote.date._:Date"));//"Tanggal tidak boleh lebih besar dari tanggal hari ini";
                    // }
                    if (valid.useStorage) {
                        if (!_storage)
                            errors["storage"] = i18n.__("UnitReceiptNote.storage.isRequired:%s name  is required", i18n.__("UnitReceiptNote.storage._:Storage")); //"Nama storage tidak boleh kosong";
                        else {
                            if (_storage.unit) {
                                if (_storage.unit.code != valid.unit.code) {
                                    errors["storage"] = i18n.__("UnitReceiptNote.storage.shouldNot:%s unit name is not matched with unit name", i18n.__("UnitReceiptNote.storage._:Storage")); //"Nama unit storage tidak sama dengan nama unit";
                                }
                            }
                        }
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
                            errors["date"] = i18n.__("UnitReceiptNote.date.isGreaterDO:%s is less than delivery order date", i18n.__("UnitReceiptNote.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
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
                                if (item.deliveredQuantity <= 0) {
                                    itemError["deliveredQuantity"] = i18n.__("UnitReceiptNote.items.deliveredQuantity.isRequired:%s is required", i18n.__("UnitReceiptNote.items.deliveredQuantity._:Delivered Quantity")); //Jumlah barang tidak boleh kosong";
                                } else if (item.deliveredQuantity > _deliveredQuantity) {
                                    itemError["deliveredQuantity"] = i18n.__("UnitReceiptNote.items.deliveredQuantity.isRequired:%s must not be greater than delivered quantity on delivery order", i18n.__("UnitReceiptNote.items.deliveredQuantity._:Delivered Quantity")); //Jumlah barang tidak boleh kosong";
                                }

                                if (!item.quantityConversion || item.quantityConversion === 0) {
                                    itemError["quantityConversion"] = i18n.__("UnitReceiptNote.items.quantityConversion.isRequired:%s is required or not 0", i18n.__("UnitReceiptNote.items.quantityConversion._:Quantity Conversion")); //"Jumlah barang diterima tidak boleh kosong";
                                }

                                if (!item.quantityConversion || item.quantityConversion === 0) {
                                    itemError["quantityConversion"] = i18n.__("UnitReceiptNote.items.quantityConversion.isRequired:%s is required or not 0", i18n.__("UnitReceiptNote.items.quantityConversion._:Quantity Conversion"));
                                }

                                if (!item.uomConversion || !item.uomConversion.unit || item.uomConversion.unit === "") {
                                    itemError["uomConversion"] = i18n.__("UnitReceiptNote.items.uomConversion.isRequired:%s is required", i18n.__("UnitReceiptNote.items.uomConversion._:Uom Conversion"));
                                }
                                if (Object.getOwnPropertyNames(item.uomConversion).length > 0 && Object.getOwnPropertyNames(item.deliveredUom).length > 0) {
                                    if (item.uomConversion.unit.toString() === item.deliveredUom.unit.toString()) {
                                        if (item.conversion !== 1) {
                                            // itemError["conversion"] = i18n.__("UnitReceiptNote.items.conversion.isRequired:%s must be 1", i18n.__("UnitReceiptNote.items.conversion._:Conversion"));
                                        }
                                    } else {
                                        if (item.conversion === 1) {
                                            // itemError["conversion"] = i18n.__("UnitReceiptNote.items.conversion.isRequired:%s must not be 1", i18n.__("UnitReceiptNote.items.conversion._:Conversion"));
                                        }
                                    }
                                } else {
                                    itemError["uomConversion"] = i18n.__("UnitReceiptNote.items.uomConversion.isRequired:%s is required", i18n.__("UnitReceiptNote.items.uomConversion._:Uom Conversion"));
                                }
                                if (item.buyer) {
                                    if (!item.buyer._id)
                                        itemError["buyer"] = i18n.__("UnitReceiptNote.items.buyer.isRequired:%s is required", i18n.__("UnitReceiptNote.items.buyer._:Buyer"));
                                }
                                else if (!item.buyer)
                                    itemError["buyer"] = i18n.__("UnitReceiptNote.items.buyer.isRequired:%s is required", i18n.__("UnitReceiptNote.items.buyer._:Buyer"));

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
                    if (valid.useStorage) {
                        if (_storage) {
                            valid.storageId = new ObjectId(_storage._id);
                            valid.storageName = _storage.name;
                            valid.storageCode = _storage.code;
                        }
                    } else {
                        valid.storageId = {};
                        valid.storageName = '';
                        valid.storageCode = '';
                        valid.useStorage = false;
                    }
                    valid.unitId = new ObjectId(_unit._id);
                    valid.unit = _unit;
                    valid.supplierId = new ObjectId(_supplier._id);
                    valid.supplier = _supplier;
                    valid.deliveryOrderId = new ObjectId(_deliveryOrder._id);
                    valid.deliveryOrderNo = _deliveryOrder.no;
                    valid.date = new Date(valid.date);

                    for (var item of valid.items) {
                        var _purchaseOrder = _purchaseOrderList.find((poInternal) => poInternal._id.toString() === item.purchaseOrderId.toString())
                        var _purchaseOrderItem = _purchaseOrder.items.find((item) => item.product._id.toString() === item.product._id.toString())
                        // item.product = _purchaseOrderItem.product;
                        // item.deliveredUom = _purchaseOrderItem.dealUom;
                        // item.currency = _purchaseOrderItem.currency;
                        // item.category = _purchaseOrderItem.category;
                        // item.categoryId = new ObjectId(item.categoryId);
                        // item.purchaseOrderId = new ObjectId(item.purchaseOrderId);
                        // item.purchaseRequestId = new ObjectId(item.purchaseRequestId);

                        item.purchaseOrderNo = _purchaseOrder.no;
                        item.purchaseRequestNo = _purchaseOrder.purchaseRequest.no;
                        item.purchaseRequestRefNo = _purchaseOrderItem.refNo;
                        item.roNo = _purchaseOrder.roNo;
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

    _beforeUpdate(data) {
        return this.getSingleById(data._id)
            .then((unitReceiptNote) => this.updatePurchaseOrderDeleteUnitReceiptNote(unitReceiptNote))
            .then((unitReceiptNote) => this.updateDeliveryOrderDeleteUnitReceiptNote(unitReceiptNote))
            .then((unitReceiptNote) => this.updateInternNote(unitReceiptNote))
            .then(unitReceiptNote => {
                if (ObjectId.isValid(unitReceiptNote.storageId)) {
                    return this.storageManager.getSingleByQueryOrDefault(unitReceiptNote.storageId)
                        .then(storage => {
                            var temp = {};
                            var index = 0;
                            var obj = null;
                            for (var i = 0; i < unitReceiptNote.items.length; i++) {
                                index = i;
                                obj = {
                                    productId: unitReceiptNote.items[i].product._id.toString(),
                                    quantity: unitReceiptNote.items[i].deliveredQuantity,
                                    uomId: unitReceiptNote.items[i].deliveredUom._id,
                                    remark: unitReceiptNote.items[i].deliveredQuantity + " " + unitReceiptNote.items[i].remark
                                };
                                //obj=unitReceiptNote.items[i];
                                var dup = unitReceiptNote.items.find((test, idx) =>
                                    obj.productId.toString() === test.product._id.toString() && obj.uomId.toString() === test.deliveredUom._id.toString() && index != idx);
                                if (!dup) {
                                    temp[obj.productId + obj.uomId.toString()] = obj;
                                } else {
                                    if (!temp[obj.productId + obj.uomId.toString()]) {
                                        temp[obj.productId + obj.uomId.toString()] = obj;
                                    } else {
                                        temp[obj.productId + obj.uomId.toString()].remark += "; " + obj.remark;
                                        temp[obj.productId + obj.uomId.toString()].quantity += obj.quantity;
                                    }
                                }
                            }
                            var result = [];
                            for (var prop in temp)
                                result.push(temp[prop]);


                            var doc = {
                                date: unitReceiptNote.date,
                                referenceNo: unitReceiptNote.no,
                                referenceType: "Bon Terima Unit",
                                type: "OUT",
                                storageId: storage._id,
                                remark: unitReceiptNote.remark,
                                items: result
                            }

                            return this.garmentInventoryDocumentManager.create(doc)
                                .then(() => {
                                    return Promise.resolve(data);
                                });
                        })
                } else {
                    return data;
                }
            });
    }

    _beforeInsert(unitReceiptNote) {
        unitReceiptNote.no = generateCode();
        unitReceiptNote.date = new Date();
        return Promise.resolve(unitReceiptNote);
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((unitReceiptNote) => this.updatePurchaseOrder(unitReceiptNote))
            .then((unitReceiptNote) => this.updateDeliveryOrder(unitReceiptNote))
            .then((unitReceiptNote) => this.updateInternNote(unitReceiptNote))
            .then((unitReceiptNote) => {
                if (ObjectId.isValid(unitReceiptNote.storageId)) {
                    return this.unitManager.getSingleByQueryOrDefault(unitReceiptNote.unit._id)
                        .then(unit => {
                            return this.storageManager.getSingleByQueryOrDefault(unitReceiptNote.storageId)
                                .then(storage => {
                                    var temp = {};
                                    var index = 0;
                                    var obj = null;
                                    for (var i = 0; i < unitReceiptNote.items.length; i++) {
                                        index = i;
                                        obj = {
                                            productId: unitReceiptNote.items[i].product._id.toString(),
                                            quantity: unitReceiptNote.items[i].deliveredQuantity,
                                            uomId: unitReceiptNote.items[i].deliveredUom._id,
                                            remark: unitReceiptNote.items[i].deliveredQuantity + " " + unitReceiptNote.items[i].remark
                                        };
                                        //obj=unitReceiptNote.items[i];
                                        var dup = unitReceiptNote.items.find((test, idx) =>
                                            obj.productId.toString() === test.product._id.toString() && obj.uomId.toString() === test.deliveredUom._id.toString() && index != idx);
                                        if (!dup) {
                                            temp[obj.productId + obj.uomId.toString()] = obj;
                                        } else {
                                            if (!temp[obj.productId + obj.uomId.toString()]) {
                                                temp[obj.productId + obj.uomId.toString()] = obj;
                                            } else {
                                                temp[obj.productId + obj.uomId.toString()].remark += "; " + obj.remark;
                                                temp[obj.productId + obj.uomId.toString()].quantity += obj.quantity;
                                            }
                                        }
                                    }
                                    var result = [];
                                    for (var prop in temp)
                                        result.push(temp[prop]);

                                    var doc = {
                                        date: unitReceiptNote.date,
                                        referenceNo: unitReceiptNote.no,
                                        referenceType: "Bon Terima Unit " + unit.name,
                                        type: "IN",
                                        storageId: storage._id,
                                        remark: unitReceiptNote.remark,
                                        items: result
                                    }

                                    return this.garmentInventoryDocumentManager.create(doc)
                                        .then(() => {
                                            return id;
                                        });
                                })
                        })
                } else {
                    return id;
                }

            })
    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((unitReceiptNote) => this.updatePurchaseOrderUpdateUnitReceiptNote(unitReceiptNote))
            .then((unitReceiptNote) => this.updateDeliveryOrderUpdateUnitReceiptNote(unitReceiptNote))
            .then((unitReceiptNote) => this.updateInternNote(unitReceiptNote))
            .then((unitReceiptNote) => {
                if (ObjectId.isValid(unitReceiptNote.storageId)) {
                    return this.unitManager.getSingleByQueryOrDefault(unitReceiptNote.unit._id)
                        .then(unit => {
                            return this.storageManager.getSingleByQueryOrDefault(unitReceiptNote.storageId)
                                .then(storage => {
                                    var temp = {};
                                    var index = 0;
                                    var obj = null;
                                    for (var i = 0; i < unitReceiptNote.items.length; i++) {
                                        index = i;
                                        obj = {
                                            productId: unitReceiptNote.items[i].product._id.toString(),
                                            quantity: unitReceiptNote.items[i].deliveredQuantity,
                                            uomId: unitReceiptNote.items[i].deliveredUom._id,
                                            remark: unitReceiptNote.items[i].deliveredQuantity + " " + unitReceiptNote.items[i].remark
                                        };
                                        //obj=unitReceiptNote.items[i];
                                        var dup = unitReceiptNote.items.find((test, idx) =>
                                            obj.productId.toString() === test.product._id.toString() && obj.uomId.toString() === test.deliveredUom._id.toString() && index != idx);
                                        if (!dup) {
                                            temp[obj.productId + obj.uomId.toString()] = obj;
                                        } else {
                                            if (!temp[obj.productId + obj.uomId.toString()]) {
                                                temp[obj.productId + obj.uomId.toString()] = obj;
                                            } else {
                                                temp[obj.productId + obj.uomId.toString()].remark += "; " + obj.remark;
                                                temp[obj.productId + obj.uomId.toString()].quantity += obj.quantity;
                                            }
                                        }
                                    }
                                    var items = [];
                                    for (var prop in temp)
                                        items.push(temp[prop]);
                                    var doc = {
                                        date: unitReceiptNote.date,
                                        referenceNo: unitReceiptNote.no,
                                        referenceType: "Bon Terima Unit " + unit.name,
                                        type: "IN",
                                        storageId: storage._id,
                                        remark: unitReceiptNote.remark,
                                        items: items
                                    }

                                    return this.garmentInventoryDocumentManager.create(doc)
                                        .then(() => {
                                            return id;
                                        });
                                })
                        })
                } else {
                    return id;
                }

            })

    }

    updatePurchaseOrder(unitReceiptNote) {
        var map = new Map();
        for (var item of unitReceiptNote.items) {
            var key = item.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            var _item = {
                productId: item.product._id,
                deliveredQuantity: item.deliveredQuantity,
                deliveredUom: item.deliveredUom
            };
            map.get(key).push(_item);
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
            var _item = {
                productId: item.product._id,
                deliveredQuantity: item.deliveredQuantity,
                deliveredUom: item.deliveredUom
            };
            map.get(key).push(_item);
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
            var _item = {
                productId: item.product._id,
                deliveredQuantity: item.deliveredQuantity,
                deliveredUom: item.deliveredUom
            };
            map.get(key).push(_item);
        }
        return this.deliveryOrderManager.getSingleById(unitReceiptNote.deliveryOrderId, ["isClosed"])
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

                return Promise.all(jobs)
                    .then((results) => {
                        return Promise.resolve(unitReceiptNote);
                    })
                    .catch(e => {
                        reject(e);
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
                            .then((unitReceiptNote) => this.updatePurchaseOrderDeleteUnitReceiptNote(unitReceiptNote))
                            .then((unitReceiptNote) => this.updateDeliveryOrderDeleteUnitReceiptNote(unitReceiptNote))
                            .then((unitReceiptNote) => this.updateInternNote(unitReceiptNote))
                            .then((unitReceiptNote) => {
                                if (ObjectId.isValid(unitReceiptNote.storageId)) {
                                    return this.unitManager.getSingleByQueryOrDefault(unitReceiptNote.unit._id)
                                        .then(unit => {
                                            return this.storageManager.getSingleByQueryOrDefault(unitReceiptNote.storageId)
                                                .then(storage => {
                                                    var temp = {};
                                                    var index = 0;
                                                    var obj = null;
                                                    for (var i = 0; i < unitReceiptNote.items.length; i++) {
                                                        index = i;
                                                        obj = {
                                                            productId: unitReceiptNote.items[i].product._id.toString(),
                                                            quantity: unitReceiptNote.items[i].deliveredQuantity,
                                                            uomId: unitReceiptNote.items[i].deliveredUom._id,
                                                            remark: unitReceiptNote.items[i].deliveredQuantity + " " + unitReceiptNote.items[i].remark
                                                        };
                                                        //obj=unitReceiptNote.items[i];
                                                        var dup = unitReceiptNote.items.find((test, idx) =>
                                                            obj.productId.toString() === test.product._id.toString() && obj.uomId.toString() === test.deliveredUom._id.toString() && index != idx);
                                                        if (!dup) {
                                                            temp[obj.productId + obj.uomId.toString()] = obj;
                                                        } else {
                                                            if (!temp[obj.productId + obj.uomId.toString()]) {
                                                                temp[obj.productId + obj.uomId.toString()] = obj;
                                                            } else {
                                                                temp[obj.productId + obj.uomId.toString()].remark += "; " + obj.remark;
                                                                temp[obj.productId + obj.uomId.toString()].quantity += obj.quantity;
                                                            }
                                                        }
                                                    }
                                                    var items = [];
                                                    for (var prop in temp)
                                                        items.push(temp[prop]);

                                                    var doc = {
                                                        date: unitReceiptNote.date,
                                                        referenceNo: unitReceiptNote.no,
                                                        referenceType: "Bon Terima Unit " + unit.name,
                                                        type: "OUT",
                                                        storageId: storage._id,
                                                        remark: unitReceiptNote.remark,
                                                        items: items
                                                    }

                                                    return this.garmentInventoryDocumentManager.create(doc)
                                                        .then(() => {
                                                            return unitReceiptNote._id;
                                                        });
                                                })
                                        })
                                } else {
                                    return id;
                                }

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
                                    return this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrderId, ["_id", "no", "artikel", "roNo"])
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

        var createdDateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentUnitReceiptNote}__createdDate`,
            key: {
                _createdDate: -1
            }
        }
        return this.collection.createIndexes([dateIndex, noIndex, createdDateIndex]);
    }

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

    getUnitReceiptReport(query, user) {
        return new Promise((resolve, reject) => {

            var deletedQuery = { _deleted: false };
            var userQuery = { _createdBy: user.username };


            var date = new Date();
            var dateString = moment(date).format('YYYY-MM-DD');
            var dateNow = new Date(dateString);
            var dateBefore = dateNow.setDate(dateNow.getDate() - 30);
            var dateQuery = {
                "date": {
                    "$gte": (!query || !query.dateFrom ? (new Date(dateBefore)) : (new Date(query.dateFrom))),
                    "$lte": (!query || !query.dateTo ? date : (new Date(query.dateTo + "T23:59")))
                }
            };

            var noQuery = {};
            if (query.no) {
                noQuery = {
                    "no": (query.no)
                };
            }

            var purchaseRequestQuery = {};
            if (query.pr) {
                purchaseRequestQuery = {
                    "items.purchaseRequestNo": (query.pr)
                };
            }

            var purchaseRequestRefNoQuery = {};
            if (query.purchaseRequestRefNo) {
                purchaseRequestRefNoQuery = {
                    "items.purchaseRequestRefNo": (query.purchaseRequestRefNo)
                };
            }

            var roNoQuery = {};
            if (query.roNo) {
                roNoQuery = {
                    "items.roNo": (query.roNo)
                }
            }

            var deliveryorderNoQuery = {};
            if (query.deliveryorderNo) {
                deliveryorderNoQuery = {
                    "deliveryOrderNo": (query.deliveryorderNo)
                }
            }

            var unitQuery = {};
            if (query.unit) {
                unitQuery = {
                    "unit.code": (query.unit)
                };
            }

            var supplierQuery = {};
            if (query.supplier) {
                supplierQuery = {
                    "supplier.code": (query.supplier)
                };
            }


            var Query = { "$and": [userQuery, dateQuery, deletedQuery, supplierQuery, purchaseRequestRefNoQuery, roNoQuery, deliveryorderNoQuery, unitQuery, purchaseRequestQuery, noQuery] };
            this.collection
                .aggregate([
                    { "$unwind": "$items" }
                    , { "$unwind": "$items.product" }
                    , { "$match": Query }
                    , {
                        "$project": {
                            "no": "$no",
                            "date": 1,
                            "unit": "$unit.name",
                            "supplier": "$supplier.name",
                            "deliveryorderNo": "$deliveryOrderNo",
                            "purchaseRequestNo": "$items.purchaseRequestNo",
                            "purchaseRequestRefNo": "$items.purchaseRequestRefNo",
                            "roNo": "$items.roNo",
                            "productCode": "$items.product.code",
                            "productName": "$items.product.name",
                            "quantity": "$items.deliveredQuantity",
                            "unitCode": "$items.deliveredUom.unit",
                            "remark": "$items.remark",
                        }
                    },

                    {
                        "$sort": {
                            "date": 1,
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

     getAllData(startdate, enddate, offset) {
        return new Promise((resolve, reject) => {
            var now = new Date();
            var deleted = {
                _deleted: false
            };
  
            var query = [deleted];

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

            var match = { '$and': query };
            
            var DOColl = map.garmentPurchasing.collection.GarmentDeliveryOrder;
            this.collection.aggregate(
                [{
                    $match: match
                }, {
                    $unwind: "$items"
                },
                {
                    $lookup: {
                        from: DOColl,
                        foreignField: "no",
                        localField: "deliveryOrderNo",
                        as: "DO"
                    },
                },
                {
                    $project: {
                        "NoBon": "$no",
                        "TgBon": "$date",
                        "Konf": "$unit.code",
                        "NoSJ": "$deliveryOrderNo",
                        "KdSpl": "$supplier.code",
                        "NmSpl": "$supplier.name",
                        "Lokasi": "$storageName",
                        "PlanPO": "$items.purchaseRequestRefNo",
                        "NoRO": "$items.roNo",
                        "KdBrg": "$items.product.code",
                        "NmBrg": "$items.remark",
                        "QtyBon": "$items.deliveredQuantity",
                        "SatBon": "$items.deliveredUom.unit",
                        "Konversi": "$items.conversion",
                        "SatKonv": "$items.uomConversion.unit",
                        "TgIn":"$_createdDate",
                        "UserIn":"$_createdBy",
                        "TgEd":"$_updatedDate",
                        "UserEd":"$_updatedBy",
                        "DOs": "$DO"
                    }
                },
                { $unwind: "$DOs" },
                {
                    $project: {
                        "NoBon": "$NoBon", "TgBon": "$TgBon", "Konf": "$Konf","NoSJ": "$NoSJ", "KdSpl": "$KdSpl",
                        "NmSpl": "$NmSpl", "Lokasi": "$Lokasi", "PlanPO": "$PlanPO", "NoRO": "$NoRO", "KdBrg": "$KdBrg",
                        "NmBrg": "$NmBrg", "QtyBon": "$QtyBon","SatBon": "$SatBon","SatKonv": "$SatKonv", "Konversi": "$Konversi",
                        "TgIn": "$TgIn", "UserIn": "$UserIn", "TgEd": "$TgEd", "UserEd": "$UserEd",
                        "TgSJ": "$DOs.supplierDoDate", "TgDtg": "$DOs.date"
                    }
                },
                {
                    $group: {
                        _id: {
                            NoBon: "$NoBon", TgBon: "$TgBon", Konf: "$Konf", NoSJ: "$NoSJ", KdSpl: "$KdSpl",
                            NmSpl: "$NmSpl", Lokasi: "$Lokasi", PlanPO: "$PlanPO", NoRO: "$NoRO", KdBrg: "$KdBrg",
                            NmBrg: "$NmBrg", QtyBon: "$QtyBon", SatBon: "$SatBon", SatKonv: "$SatKonv", Konversi: "$Konversi",
                            TgIn: "$TgIn", UserIn: "$UserIn", TgEd: "$TgEd", UserEd: "$UserEd",
                            TgSJ: "$TgSJ", TgDtg: "$TgDtg"
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

    getUnitReceiptReportXls(dataReport, query) {

        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            xls.options = [];
            xls.name = '';

            var dateFormat = "DD/MM/YYYY";

            for (var data of dataReport.data) {
                var item = {};
                item["No Bon Terima Unit"] = data.no;
                item["Tanggal Bon Terima Unit"] = data.date ? moment(data.date).format(dateFormat) : '';
                item["Unit"] = data.unit ? data.unit : '';
                item["Supplier"] = data.supplier ? data.supplier : '';
                item["Surat Jalan"] = data.deliveryorderNo ? data.deliveryorderNo : '';
                item["No PR"] = data.purchaseRequestNo ? data.purchaseRequestNo : '';
                item["No Ref PR"] = data.purchaseRequestRefNo ? data.purchaseRequestRefNo : '';
                item["No RO"] = data.roNo ? data.roNo : '';
                item["Kode Barang"] = data.productCode ? data.productCode : '';
                item["Nama Barang"] = data.productName ? data.productName : '';
                item["Jumlah"] = data.quantity ? data.quantity : '';
                item["Satuan"] = data.unitCode ? data.unitCode : '';
                item["Keterangan"] = data.remark ? data.remark : '';
                xls.data.push(item);

            }

            xls.options["No Bon Terima Unit"] = "string";
            xls.options["Tanggal Bon Terima Unit"] = "string";
            xls.options["Unit"] = "string";
            xls.options["Supplier"] = "string";
            xls.options["Surat Jalan"] = "string";
            xls.options["No PR"] = "string";
            xls.options["No Ref PR"] = "string";
            xls.options["No RO"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Jumlah"] = "number";
            xls.options["Satuan"] = "string";
            xls.options["Keterangan"] = "string";

            if (query.dateFrom && query.dateTo) {
                xls.name = `Unit Receipt Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (!query.dateFrom && query.dateTo) {
                xls.name = `Unit Receipt Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (query.dateFrom && !query.dateTo) {
                xls.name = `Unit Receipt Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
            }
            else
                xls.name = `Unit Receipt Report.xlsx`;

            resolve(xls);
        });
    }

    getUnitReceiptAllReport(query, user) {
        return new Promise((resolve, reject) => {

            var deletedQuery = { _deleted: false };

            var date = new Date();
            var dateString = moment(date).format('YYYY-MM-DD');
            var dateNow = new Date(dateString);
            var dateBefore = dateNow.setDate(dateNow.getDate() - 30);
            var dateQuery = {
                "date": {
                    "$gte": (!query || !query.dateFrom ? (new Date(dateBefore)) : (new Date(query.dateFrom))),
                    "$lte": (!query || !query.dateTo ? date : (new Date(query.dateTo + "T23:59")))
                }
            };

            var noQuery = {};
            if (query.no) {
                noQuery = {
                    "no": (query.no)
                };
            }

            var purchaseRequestQuery = {};
            if (query.pr) {
                purchaseRequestQuery = {
                    "items.purchaseRequestNo": (query.pr)
                };
            }

            var purchaseRequestRefNoQuery = {};
            if (query.purchaseRequestRefNo) {
                purchaseRequestRefNoQuery = {
                    "items.purchaseRequestRefNo": (query.purchaseRequestRefNo)
                };
            }

            var roNoQuery = {};
            if (query.roNo) {
                roNoQuery = {
                    "items.roNo": (query.roNo)
                }
            }

            var deliveryorderNoQuery = {};
            if (query.deliveryorderNo) {
                deliveryorderNoQuery = {
                    "deliveryOrderNo": (query.deliveryorderNo)
                }
            }

            var unitQuery = {};
            if (query.unit) {
                unitQuery = {
                    "unit.code": (query.unit)
                };
            }

            var supplierQuery = {};
            if (query.supplier) {
                supplierQuery = {
                    "supplier.code": (query.supplier)
                };
            }


            var Query = { "$and": [dateQuery, deletedQuery, supplierQuery, purchaseRequestRefNoQuery, roNoQuery, deliveryorderNoQuery, unitQuery, purchaseRequestQuery, noQuery] };
            this.collection
                .aggregate([
                    { "$unwind": "$items" }
                    , { "$unwind": "$items.product" }
                    , { "$match": Query }
                    , {
                        "$project": {
                            "no": "$no",
                            "date": 1,
                            "unit": "$unit.name",
                            "supplier": "$supplier.name",
                            "deliveryorderNo": "$deliveryOrderNo",
                            "purchaseRequestNo": "$items.purchaseRequestNo",
                            "purchaseRequestRefNo": "$items.purchaseRequestRefNo",
                            "roNo": "$items.roNo",
                            "artikel": "$items.artikel",
                            "productCode": "$items.product.code",
                            "productName": "$items.product.name",
                            "quantity": "$items.deliveredQuantity",
                            "unitCode": "$items.deliveredUom.unit",
                            "remark": "$items.remark",
                            "createdBy": "$_createdBy",
                        }
                    },

                    {
                        "$sort": {
                            "date": 1,
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

    getUnitReceiptAllReportXls(dataReport, query) {

        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            xls.options = [];
            xls.name = '';

            var dateFormat = "DD/MM/YYYY";

            for (var data of dataReport.data) {
                var item = {};
                item["No Bon Terima Unit"] = data.no;
                item["Tanggal Bon Terima Unit"] = data.date ? moment(data.date).format(dateFormat) : '';
                item["Unit"] = data.unit ? data.unit : '';
                item["Supplier"] = data.supplier ? data.supplier : '';
                item["Surat Jalan"] = data.deliveryorderNo ? data.deliveryorderNo : '';
                item["No PR"] = data.purchaseRequestNo ? data.purchaseRequestNo : '';
                item["No Ref PR"] = data.purchaseRequestRefNo ? data.purchaseRequestRefNo : '';
                item["No RO"] = data.roNo ? data.roNo : '';
                item["Artikel"] = data.artikel ? data.artikel : '';
                item["Kode Barang"] = data.productCode ? data.productCode : '';
                item["Nama Barang"] = data.productName ? data.productName : '';
                item["Jumlah"] = data.quantity ? data.quantity : '';
                item["Satuan"] = data.unitCode ? data.unitCode : '';
                item["Keterangan"] = data.remark ? data.remark : '';
                item["User"] = data.createdBy ? data.createdBy : '';
                xls.data.push(item);

            }

            xls.options["No Bon Terima Unit"] = "string";
            xls.options["Tanggal Bon Terima Unit"] = "string";
            xls.options["Unit"] = "string";
            xls.options["Supplier"] = "string";
            xls.options["Surat Jalan"] = "string";
            xls.options["No PR"] = "string";
            xls.options["No Ref PR"] = "string";
            xls.options["No RO"] = "string";
            xls.options["Artikel"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Jumlah"] = "number";
            xls.options["Satuan"] = "string";
            xls.options["Keterangan"] = "string";
            xls.options["User"] = "string";

            if (query.dateFrom && query.dateTo) {
                xls.name = `Unit Receipt Report All ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (!query.dateFrom && query.dateTo) {
                xls.name = `Unit Receipt Report All ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (query.dateFrom && !query.dateTo) {
                xls.name = `Unit Receipt Report All ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
            }
            else
                xls.name = `Unit Receipt Report All.xlsx`;

            resolve(xls);
        });
    }

    updateInternNote(unitReceiptNote) {
        return this.deliveryOrderManager.getSingleByIdOrDefault(unitReceiptNote.deliveryOrderId, ["no", "items.fulfillments.purchaseOrderId"])
            .then((deliveryOrder) => {
                var listPurchaseOrderIds = [];
                for (var item of deliveryOrder.items) {
                    for (var fulfillment of item.fulfillments) {
                        listPurchaseOrderIds.push(fulfillment.purchaseOrderId.toString())
                    }
                }
                listPurchaseOrderIds = [].concat.apply([], listPurchaseOrderIds);
                listPurchaseOrderIds = listPurchaseOrderIds.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var getPOjobs = []

                for (var purchaseOrderId of listPurchaseOrderIds) {
                    getPOjobs.push(this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrderId, ["no", "items.fulfillments"]))
                }
                return Promise.all(getPOjobs)
                    .then(listPurchaseOrders => {
                        var listNI = [];

                        for (var purchaseOrder of listPurchaseOrders) {
                            for (var poItem of purchaseOrder.items) {
                                for (var poFulfillment of poItem.fulfillments) {
                                    if (poFulfillment.deliveryOrderNo) {
                                        if (poFulfillment.deliveryOrderNo === deliveryOrder.no) {
                                            if (poFulfillment.interNoteNo) {
                                                listNI.push(poFulfillment.interNoteNo)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        listNI = listNI.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })

                        var getNIJobs = [];
                        for (var ni of listNI) {
                            getNIJobs.push(this.internNoteManager.getSingleByQueryOrDefault({ "no": ni }))
                        }

                        return Promise.all(getNIJobs)
                    })
                    .then((listInternNotes) => {
                        var jobs = [];
                        for (var interNote of listInternNotes) {
                            jobs.push(this.internNoteManager.updateStatusNI(interNote));
                        }
                        return Promise.all(jobs)
                            .then((results) => {
                                return Promise.resolve(unitReceiptNote);
                            })
                    })
                    .catch(e => {
                        reject(e);
                    })
            })
    }
};