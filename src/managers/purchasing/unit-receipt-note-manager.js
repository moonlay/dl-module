'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var UnitReceiptNote = DLModels.purchasing.UnitReceiptNote;
var PurchaseOrderManager = require('./purchase-order-manager');
var DeliveryOrderManager = require('./delivery-order-manager');
var UnitManager = require('../master/unit-manager');
var SupplierManager = require('../master/supplier-manager');
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;

module.exports = class UnitReceiptNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitReceiptNote);
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
            var getDeliveryOrder = valid.deliveryOrder && ObjectId.isValid(valid.deliveryOrder._id) ? this.deliveryOrderManager.getSingleByIdOrDefault(valid.deliveryOrder._id) : Promise.resolve(null);
            var getUnit = valid.unit && ObjectId.isValid(valid.unit._id) ? this.unitManager.getSingleByIdOrDefault(valid.unit._id) : Promise.resolve(null);
            var getSupplier = valid.supplier && ObjectId.isValid(valid.supplier._id) ? this.supplierManager.getSingleByIdOrDefault(valid.supplier._id) : Promise.resolve(null);
            var getPurchaseOrder = [];
            if (valid.deliveryOrder) {
                for (var doItem of valid.deliveryOrder.items) {
                    for (var fulfillment of doItem.fulfillments)
                        if (ObjectId.isValid(fulfillment.purchaseOrder._id))
                            getPurchaseOrder.push(this.purchaseOrderManager.getSingleByIdOrDefault(fulfillment.purchaseOrder._id));
                }
            }
            else
                getPurchaseOrder = Promise.resolve(null);

            Promise.all([getUnitReceiptNotePromise, getDeliveryOrder, getUnit, getSupplier, getPurchaseOrder])
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

                    if (valid.deliveryOrder) {
                        if (!valid.deliveryOrder._id)
                            errors["deliveryOrder"] = i18n.__("UnitReceiptNote.deliveryOrder.isRequired:%s is required", i18n.__("UnitReceiptNote.deliveryOrder._:Delivery Order No")); //"No. surat jalan tidak boleh kosong";
                    }
                    else if (!valid.deliveryOrder)
                        errors["deliveryOrder"] = i18n.__("UnitReceiptNote.deliveryOrder.isRequired:%s is required", i18n.__("UnitReceiptNote.deliveryOrder._:Delivery Order No")); //"No. surat jalan tidak boleh kosong";
                    else if (!_deliveryOrder)
                        errors["deliveryOrder"] = i18n.__("UnitReceiptNote.deliveryOrder.isRequired:%s is required", i18n.__("UnitReceiptNote.deliveryOrder._:Delivery Order No.")); //"No. surat jalan tidak boleh kosong";

                    if (valid.items) {
                        if (valid.items.length <= 0) {
                            errors["items"] = i18n.__("UnitReceiptNote.items.isRequired:%s is required", i18n.__("UnitReceiptNote.items._:Item")); //"Harus ada minimal 1 barang";
                        }
                        else {
                            var itemErrors = [];
                            for (var item of valid.items) {
                                var itemError = {};
                                if (item.deliveredQuantity <= 0)
                                    itemError["deliveredQuantity"] = i18n.__("UnitReceiptNote.items.deliveredQuantity.isRequired:%s is required", i18n.__("UnitReceiptNote.items.deliveredQuantity._:Delivered Quantity")); //Jumlah barang tidak boleh kosong";
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
                    }
                    else {
                        errors["items"] = i18n.__("UnitReceiptNote.items.isRequired:%s is required", i18n.__("UnitReceiptNote.items._:Item")); //"Harus ada minimal 1 barang";
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
                    valid.deliveryOrder = _deliveryOrder;
                    valid.date = new Date(valid.date);

                    for (var item of valid.items) {
                        for (var _po of _purchaseOrderList) {
                            var _poId = new ObjectId(item.purchaseOrder._id);
                            if (_poId.equals(_po._id)) {
                                item.purchaseOrder = _po;
                                item.purchaseOrderId = _po._id;
                                item.currency = _po.currency;
                                item.currencyRate = _po.currencyRate;

                                for (var _poItem of _po.items) {
                                    var _productId = new ObjectId(item.product._id);
                                    if (_productId.equals(_poItem.product._id)) {
                                        item.product = _poItem.product;
                                        item.deliveredUom = _poItem.dealUom;
                                        break;
                                    }
                                }
                                break;
                            }
                        }

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
                "deliveryOrder.no": {
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

    create(unitReceiptNote) {
        return new Promise((resolve, reject) => {
            var tasksUpdatePoInternal = [];
            var getPurchaseOrderById = [];
            this._validate(unitReceiptNote)
                .then(validUnitReceiptNote => {
                    validUnitReceiptNote.no = generateCode();
                    validUnitReceiptNote._createdDate = new Date();

                    //Update PO Internal
                    var poId = new ObjectId();
                    for (var doItem of validUnitReceiptNote.deliveryOrder.items) {
                        for (var fulfillment of doItem.fulfillments)
                            if (!poId.equals(fulfillment.purchaseOrder._id)) {
                                poId = new ObjectId(fulfillment.purchaseOrder._id);
                                if (ObjectId.isValid(fulfillment.purchaseOrder._id))
                                    getPurchaseOrderById.push(this.purchaseOrderManager.getSingleByIdOrDefault(fulfillment.purchaseOrder._id));
                            }
                    }

                    Promise.all(getPurchaseOrderById)
                        .then(purchaseOrders => {
                            for (var purchaseOrder of purchaseOrders) {
                                for (var poItem of purchaseOrder.items) {
                                    for (var unitReceiptNoteItem of validUnitReceiptNote.items) {
                                        if (unitReceiptNoteItem.purchaseOrderId.toString() == purchaseOrder._id.toString() && validUnitReceiptNote.unitId.toString() == purchaseOrder.unitId.toString()) {
                                            if (unitReceiptNoteItem.product._id.toString() == poItem.product._id.toString()) {
                                                for (var fulfillment of poItem.fulfillments) {
                                                    var fulfillmentNo = fulfillment.deliveryOrderNo || '';
                                                    var deliveryOrderNo = validUnitReceiptNote.deliveryOrder.no || '';

                                                    if (fulfillmentNo === deliveryOrderNo && !fulfillment.unitReceiptNoteNo) {
                                                        fulfillment.unitReceiptNoteNo = validUnitReceiptNote.no;
                                                        fulfillment.unitReceiptNoteDate = validUnitReceiptNote.date;
                                                        fulfillment.unitReceiptNoteDeliveredQuantity = unitReceiptNoteItem.deliveredQuantity;
                                                        fulfillment.unitReceiptDeliveredUom = unitReceiptNoteItem.deliveredUom;
                                                        break;
                                                    } else if (fulfillmentNo === deliveryOrderNo && fulfillment.unitReceiptNoteNo) {
                                                        var _fulfillment = fulfillment;
                                                        _fulfillment.unitReceiptNoteNo = validUnitReceiptNote.no;
                                                        _fulfillment.unitReceiptNoteDate = validUnitReceiptNote.date;
                                                        _fulfillment.unitReceiptNoteDeliveredQuantity = unitReceiptNoteItem.deliveredQuantity;
                                                        _fulfillment.unitReceiptDeliveredUom = unitReceiptNoteItem.deliveredUom;
                                                        poItem.fulfillments.push(_fulfillment);
                                                        break;
                                                    }
                                                }
                                            }
                                            unitReceiptNoteItem.purchaseOrder = purchaseOrder;
                                        }
                                    }
                                }
                                var _isClosed = true;
                                for (var poItem of purchaseOrder.items) {
                                    var sum = poItem.fulfillments.reduce(function (a, b) { return a + b.unitReceiptNoteDeliveredQuantity; }, 0);
                                    if (sum !== poItem.realizationQuantity) {
                                        _isClosed = false;
                                        break;
                                    }
                                }
                                if (_isClosed) {
                                    purchaseOrder.status = poStatusEnum.RECEIVED;
                                } else {
                                    purchaseOrder.status = poStatusEnum.RECEIVING;
                                }
                                tasksUpdatePoInternal.push(this.purchaseOrderManager.update(purchaseOrder));
                            }
                            Promise.all(tasksUpdatePoInternal)
                                .then(results => {
                                    this.deliveryOrderManager.getSingleByQueryOrDefault(validUnitReceiptNote.deliveryOrder._id)
                                        .then(_deliveryOrder => {
                                            for (var _item of _deliveryOrder.items) {
                                                for (var _fulfillment of _item.fulfillments) {
                                                    for (var item of validUnitReceiptNote.items) {
                                                        if (_fulfillment.purchaseOrder._id.toString() === item.purchaseOrder._id.toString() && _fulfillment.product._id.toString() === item.product._id.toString()) {
                                                            var _realizationQuantity = {
                                                                no: validUnitReceiptNote.no,
                                                                deliveredQuantity: item.deliveredQuantity
                                                            }
                                                            _fulfillment.realizationQuantity.push(_realizationQuantity);
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                            for (var _item of _deliveryOrder.items) {
                                                for (var _fulfillment of _item.fulfillments) {
                                                    var _total = 0
                                                    for (var _qty of _fulfillment.realizationQuantity) {
                                                        _total += _qty.deliveredQuantity;
                                                    }
                                                    if (_total !== _fulfillment.deliveredQuantity) {
                                                        _item.isClosed = false;
                                                        break;
                                                    }
                                                    else
                                                        _item.isClosed = true;
                                                }
                                                for (var _fulfillment of _item.fulfillments) {
                                                    if (_fulfillment.realizationQuantity.length > 0) {
                                                        _deliveryOrder.isPosted = true;
                                                        break;
                                                    } else {
                                                        _deliveryOrder.isPosted = false;
                                                    }
                                                }

                                                if (!_item.isClosed) {
                                                    _deliveryOrder.isClosed = false;
                                                    break;
                                                }
                                                else
                                                    _deliveryOrder.isClosed = true;
                                            }
                                            validUnitReceiptNote.deliveryOrder = _deliveryOrder;
                                            this.deliveryOrderManager.update(_deliveryOrder)
                                                .then(_deliveryOrderId => {
                                                    this.collection.insert(validUnitReceiptNote)
                                                        .then(id => {
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

    update(unitReceiptNote) {
        var tasksUpdatePoInternal = [];
        var getPurchaseOrderById = [];
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(unitReceiptNote)
                        .then(validUnitReceiptNote => {
                            //Update PO Internal
                            var poId = new ObjectId();
                            for (var doItem of validUnitReceiptNote.deliveryOrder.items) {
                                for (var fulfillment of doItem.fulfillments)
                                    if (!poId.equals(fulfillment.purchaseOrder._id)) {
                                        poId = new ObjectId(fulfillment.purchaseOrder._id);
                                        if (ObjectId.isValid(fulfillment.purchaseOrder._id))
                                            getPurchaseOrderById.push(this.purchaseOrderManager.getSingleByIdOrDefault(fulfillment.purchaseOrder._id));
                                    }
                            }

                            Promise.all(getPurchaseOrderById)
                                .then(results => {
                                    for (var purchaseOrder of results) {
                                        for (var poItem of purchaseOrder.items) {
                                            for (var unitReceiptNoteItem of validUnitReceiptNote.items) {
                                                if (unitReceiptNoteItem.purchaseOrderId.toString() === purchaseOrder._id.toString() && validUnitReceiptNote.unitId.toString() === purchaseOrder.unitId.toString()) {
                                                    if (unitReceiptNoteItem.product._id.toString() === poItem.product._id.toString()) {
                                                        for (var fulfillment of poItem.fulfillments) {
                                                            var fulfillmentNo = fulfillment.deliveryOrderNo || '';
                                                            var deliveryOrderNo = validUnitReceiptNote.deliveryOrder.no || '';

                                                            if (fulfillmentNo === deliveryOrderNo && fulfillment.unitReceiptNoteNo === validUnitReceiptNote.no) {
                                                                fulfillment.unitReceiptNoteNo = validUnitReceiptNote.no;
                                                                fulfillment.unitReceiptNoteDate = validUnitReceiptNote.date;
                                                                fulfillment.unitReceiptNoteDeliveredQuantity = unitReceiptNoteItem.deliveredQuantity;
                                                                fulfillment.unitReceiptDeliveredUom = unitReceiptNoteItem.deliveredUom;
                                                            }
                                                        }
                                                    }
                                                    unitReceiptNoteItem.purchaseOrder = purchaseOrder;
                                                }
                                            }
                                        }
                                        var _isClosed = true;
                                        for (var poItem of purchaseOrder.items) {
                                            var sum = poItem.fulfillments.reduce(function (a, b) { return a + b.unitReceiptNoteDeliveredQuantity; }, 0);
                                            if (sum !== poItem.realizationQuantity) {
                                                _isClosed = false;
                                                break;
                                            }
                                        }
                                        if (_isClosed) {
                                            purchaseOrder.status = poStatusEnum.RECEIVED;
                                        } else {
                                            purchaseOrder.status = poStatusEnum.RECEIVING;
                                        }
                                        tasksUpdatePoInternal.push(this.purchaseOrderManager.update(purchaseOrder));
                                    }
                                    Promise.all(tasksUpdatePoInternal)
                                        .then(results => {
                                            this.deliveryOrderManager.getSingleByQueryOrDefault(validUnitReceiptNote.deliveryOrder._id)
                                                .then(_deliveryOrder => {
                                                    for (var _item of _deliveryOrder.items) {
                                                        for (var _fulfillment of _item.fulfillments) {
                                                            for (var item of validUnitReceiptNote.items) {
                                                                if (_fulfillment.purchaseOrder._id.toString() === item.purchaseOrder._id.toString() && _fulfillment.product._id.toString() === item.product._id.toString()) {
                                                                    for (var realizationQty of _fulfillment.realizationQuantity) {
                                                                        if (realizationQty.no === validUnitReceiptNote.no) {
                                                                            realizationQty.deliveredQuantity = item.deliveredQuantity;
                                                                            break;
                                                                        }
                                                                    }
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                    for (var _item of _deliveryOrder.items) {
                                                        for (var _fulfillment of _item.fulfillments) {
                                                            var _total = 0
                                                            for (var _qty of _fulfillment.realizationQuantity) {
                                                                _total += _qty.deliveredQuantity;
                                                            }
                                                            if (_total !== _fulfillment.deliveredQuantity) {
                                                                _item.isClosed = false;
                                                                break;
                                                            }
                                                            else
                                                                _item.isClosed = true;
                                                        }
                                                        for (var _fulfillment of _item.fulfillments) {
                                                            if (_fulfillment.realizationQuantity.length > 0) {
                                                                _deliveryOrder.isPosted = true;
                                                                break;
                                                            } else {
                                                                _deliveryOrder.isPosted = false;
                                                            }
                                                        }
                                                        if (!_item.isClosed) {
                                                            _deliveryOrder.isClosed = false;
                                                            break;
                                                        }
                                                        else
                                                            _deliveryOrder.isClosed = true;
                                                    }
                                                    validUnitReceiptNote.deliveryOrder = _deliveryOrder;
                                                    this.deliveryOrderManager.update(_deliveryOrder)
                                                        .then(_deliveryOrderId => {
                                                            this.collection.update(validUnitReceiptNote)
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
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    delete(unitReceiptNote) {
        var tasksUpdatePoInternal = [];
        var getPurchaseOrderById = [];
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(unitReceiptNote)
                        .then(validUnitReceiptNote => {
                            validUnitReceiptNote._deleted = true;
                            //Update PO Internal
                            var poId = new ObjectId();
                            for (var doItem of validUnitReceiptNote.deliveryOrder.items) {
                                for (var fulfillment of doItem.fulfillments)
                                    if (!poId.equals(fulfillment.purchaseOrder._id)) {
                                        poId = new ObjectId(fulfillment.purchaseOrder._id);
                                        if (ObjectId.isValid(fulfillment.purchaseOrder._id))
                                            getPurchaseOrderById.push(this.purchaseOrderManager.getSingleByIdOrDefault(fulfillment.purchaseOrder._id));
                                    }
                            }

                            Promise.all(getPurchaseOrderById)
                                .then(results => {
                                    for (var purchaseOrder of results) {
                                        for (var poItem of purchaseOrder.items) {
                                            for (var unitReceiptNoteItem of validUnitReceiptNote.items) {
                                                if (unitReceiptNoteItem.purchaseOrderId.toString() === purchaseOrder._id.toString() && validUnitReceiptNote.unitId.toString() === purchaseOrder.unitId.toString()) {
                                                    if (unitReceiptNoteItem.product._id.toString() === poItem.product._id.toString()) {
                                                        for (var fulfillment of poItem.fulfillments) {
                                                            var fulfillmentNo = fulfillment.deliveryOrderNo || '';
                                                            var deliveryOrderNo = validUnitReceiptNote.deliveryOrder.no || '';

                                                            if (fulfillmentNo === deliveryOrderNo && fulfillment.unitReceiptNoteNo === validUnitReceiptNote.no) {
                                                                delete fulfillment.unitReceiptNoteNo;
                                                                delete fulfillment.unitReceiptNoteDate;
                                                                delete fulfillment.unitReceiptNoteDeliveredQuantity;
                                                                delete fulfillment.unitReceiptDeliveredUom;
                                                            }
                                                        }
                                                    }
                                                    if (purchaseOrder.isClosed) {
                                                        purchaseOrder.status = poStatusEnum.ARRIVED;
                                                    } else {
                                                        purchaseOrder.status = poStatusEnum.ARRIVING;
                                                    }
                                                    unitReceiptNoteItem.purchaseOrder = purchaseOrder;
                                                }
                                            }
                                        }
                                        tasksUpdatePoInternal.push(this.purchaseOrderManager.update(purchaseOrder));
                                    }
                                    Promise.all(tasksUpdatePoInternal)
                                        .then(results => {
                                            this.deliveryOrderManager.getSingleByQueryOrDefault(validUnitReceiptNote.deliveryOrder._id)
                                                .then(_deliveryOrder => {
                                                    for (var _item of _deliveryOrder.items) {
                                                        for (var _fulfillment of _item.fulfillments) {
                                                            for (var item of validUnitReceiptNote.items) {
                                                                if (_fulfillment.purchaseOrder._id.toString() === item.purchaseOrder._id.toString() && _fulfillment.product._id.toString() === item.product._id.toString()) {
                                                                    var _index;
                                                                    for (var realizationQty of _fulfillment.realizationQuantity) {
                                                                        if (realizationQty.no === validUnitReceiptNote.no) {
                                                                            _index = _fulfillment.realizationQuantity.indexOf(realizationQty);
                                                                            break;
                                                                        }
                                                                    }
                                                                    if (_index !== null) {
                                                                        _fulfillment.realizationQuantity.splice(_index, 1);
                                                                    }
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                    for (var _item of _deliveryOrder.items) {
                                                        for (var _fulfillment of _item.fulfillments) {
                                                            var _total = 0
                                                            for (var _qty of _fulfillment.realizationQuantity) {
                                                                _total += _qty.deliveredQuantity;
                                                            }
                                                            if (_total !== _fulfillment.deliveredQuantity) {
                                                                _item.isClosed = false;
                                                                break;
                                                            }
                                                            else
                                                                _item.isClosed = true;
                                                        }
                                                        for (var _fulfillment of _item.fulfillments) {
                                                            if (_fulfillment.realizationQuantity.length > 0) {
                                                                _deliveryOrder.isPosted = true;
                                                                break;
                                                            } else {
                                                                _deliveryOrder.isPosted = false;
                                                            }
                                                        }
                                                        if (!_item.isClosed) {
                                                            _deliveryOrder.isClosed = false;
                                                            break;
                                                        }
                                                        else
                                                            _deliveryOrder.isClosed = true;
                                                    }
                                                    validUnitReceiptNote.deliveryOrder = _deliveryOrder;
                                                    this.deliveryOrderManager.update(_deliveryOrder)
                                                        .then(_deliveryOrderId => {
                                                            this.collection.update(validUnitReceiptNote)
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
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(unitReceiptNote => {
                    var getDefinition = require('../../pdf/definitions/unit-receipt-note');
                    var definition = getDefinition(unitReceiptNote);

                    var generatePdf = require('../../pdf/pdf-generator');
                    generatePdf(definition)
                        .then(binary => {
                            resolve(binary);
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

    getUnitReceiptNotes(_no, _unitId, _categoryId, _supplierId, _dateFrom, _dateTo, _createdBy) {
        return new Promise((resolve, reject) => {
            var query = Object.assign({});

            var deleted = { _deleted: false };
            var createdBy = { _createdBy: _createdBy };

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
                var date = {
                    date: {
                        $gte: new Date(_dateFrom),
                        $lte: new Date(_dateTo)
                    }
                };
                Object.assign(query, date);
            }
            Object.assign(query, deleted, createdBy);

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
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.UnitReceiptNote}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.purchasing.collection.UnitReceiptNote}_no`,
            key: {
                no: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    getAllData(filter) {
        return new Promise((resolve, reject) => {
            var sorting = {
                "date": -1,
                "no": 1
            };
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

            this.collection.where(query).select(_select).order(sorting).execute()
                .then((results) => {
                    resolve(results.data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
};