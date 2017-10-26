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

                    if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("UnitReceiptNote.date.isRequired:%s is required", i18n.__("UnitReceiptNote.date._:Date")); //"Tanggal tidak boleh kosong";
                    else if (new Date(valid.date) > now) {
                        errors["date"] = i18n.__("UnitReceiptNote.date.isGreater:%s is greater than today", i18n.__("UnitReceiptNote.date._:Date"));//"Tanggal tidak boleh lebih besar dari tanggal hari ini";
                    }
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
                                            itemError["conversion"] = i18n.__("UnitReceiptNote.items.conversion.isRequired:%s must be 1", i18n.__("UnitReceiptNote.items.conversion._:Conversion"));
                                        }
                                    } else {
                                        if (item.conversion === 1) {
                                            itemError["conversion"] = i18n.__("UnitReceiptNote.items.conversion.isRequired:%s must not be 1", i18n.__("UnitReceiptNote.items.conversion._:Conversion"));
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