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
var StorageManager = require('../master/storage-manager');
var TextileInventoryDocumentManager = require('../inventory/inventory-document-manager');
var moment = require("moment");

const NUMBER_DESCRIPTION = "Bon Pembelian";

module.exports = class UnitReceiptNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitReceiptNote);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.unitManager = new UnitManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
        this.storageManager = new StorageManager(db, user);
        this.textileInventoryDocumentManager = new TextileInventoryDocumentManager(db,user);
        this.documentNumbers = this.db.collection("document-numbers");
        this.deliveryOrderFields = [
            "no",
            "refNo",
            "date",
            "supplierDoDate",
            "supplierId",
            "supplier._id",
            "supplier.code",
            "supplier.name",
            "isPosted",
            "isClosed",
            "items.isClosed",
            "items.purchaseOrderExternalId",
            "items.purchaseOrderExternal.no",
            "items.purchaseOrderExternal._id",
            "items.fulfillments.purchaseOrderQuantity",
            "items.fulfillments.purchaseOrderUom._id",
            "items.fulfillments.purchaseOrderUom.unit",
            "items.fulfillments.deliveredQuantity",
            "items.fulfillments.realizationQuantity",
            "items.fulfillments.productId",
            "items.fulfillments.product._id",
            "items.fulfillments.product.code",
            "items.fulfillments.product.name",
            "items.fulfillments.purchaseOrderId",
            "items.fulfillments.purchaseOrder._id",
            "items.fulfillments.purchaseOrder.purchaseOrderExternal.no",
            "items.fulfillments.purchaseOrder.purchaseOrderExternal._id",
            "items.fulfillments.purchaseOrder.unitId",
            "items.fulfillments.purchaseOrder.unit._id",
            "items.fulfillments.purchaseOrder.unit.code",
            "items.fulfillments.purchaseOrder.unit.name",
            "items.fulfillments.purchaseOrder.unit.divisionId",
            "items.fulfillments.purchaseOrder.currency._id",
            "items.fulfillments.purchaseOrder.currency.symbol",
            "items.fulfillments.purchaseOrder.currency.code",
            "items.fulfillments.purchaseOrder.currency.rate",
            "items.fulfillments.purchaseOrder.currencyRate",
            "items.fulfillments.purchaseOrder.categoryId",
            "items.fulfillments.purchaseOrder.category._id",
            "items.fulfillments.purchaseOrder.purchaseRequest.no",
            "items.fulfillments.purchaseOrder.purchaseRequest._id",
            "items.fulfillments.purchaseOrder.items.useIncomeTax",
            "items.fulfillments.purchaseOrder.items.product._id",
            "items.fulfillments.purchaseOrder.items.product.code",
            "items.fulfillments.purchaseOrder.items.product.name",
            "items.fulfillments.purchaseOrder.items.pricePerDealUnit"
        ];
        this.purchaseOrderFields=[
            "_id",
            "no",
            "refNo",
            "purchaseRequestId",
            "purchaseRequest._id",
            "purchaseRequest.no",
            "purchaseOrderExternalId",
            "purchaseOrderExternal._id",
            "purchaseOrderExternal.no",
            "supplierId",
            "supplier.code",
            "supplier.name",
            "supplier.address",
            "supplier.contact",
            "supplier.PIC",
            "supplier.import",
            "supplier.NPWP",
            "supplier.serialNumber",
            "unitId",
            "unit.code",
            "unit.divisionId",
            "unit.division",
            "unit.name",
            "categoryId",
            "category.code",
            "category.name",
            "freightCostBy",
            "currency.code",
            "currency.symbol",
            "currency.rate",
            "currencyRate",
            "paymentMethod",
            "paymentDueDays",
            "vat",
            "useVat",
            "vatRate",
            "useIncomeTax",
            "date",
            "expectedDeliveryDate",
            "actualDeliveryDate",
            "isPosted",
            "isClosed",
            "remark",
            "items"
        ];
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
            var getStorage= valid.storageId && ObjectId.isValid(valid.storageId) ? this.storageManager.getSingleByIdOrDefault(valid.storageId) : Promise.resolve(null);
            var getDeliveryOrder = valid.deliveryOrder && ObjectId.isValid(valid.deliveryOrder._id) ? this.deliveryOrderManager.getSingleByIdOrDefault(valid.deliveryOrder._id,this.deliveryOrderFields) : Promise.resolve(null);
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

                    if (!valid.unit)
                        errors["unit"] = i18n.__("UnitReceiptNote.unit.isRequired:%s is required", i18n.__("UnitReceiptNote.unit._:Unit")); //"Unit tidak boleh kosong";
                    else if (!_unit)
                        errors["unit"] = i18n.__("UnitReceiptNote.unit.isRequired:%s is required", i18n.__("UnitReceiptNote.unit._:Unit")); //"Unit tidak boleh kosong";

                    if (!valid.supplier)
                        errors["supplier"] = i18n.__("UnitReceiptNote.supplier.isRequired:%s name is required", i18n.__("UnitReceiptNote.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    else if (!_supplier)
                        errors["supplier"] = i18n.__("UnitReceiptNote.supplier.isRequired:%s name  is required", i18n.__("UnitReceiptNote.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";

                    if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("UnitReceiptNote.date.isRequired:%s is required", i18n.__("UnitReceiptNote.date._:Date")); //"Tanggal tidak boleh kosong";
                    
                    if(valid.isInventory){
                        if(!_storage)
                            errors["storage"] = i18n.__("UnitReceiptNote.storage.isRequired:%s name  is required", i18n.__("UnitReceiptNote.storage._:Storage")); //"Nama storage tidak boleh kosong";
                        else{
                            if(_storage.unit){
                                if(_storage.unit.code != valid.unit.code){
                                    errors["storage"]= i18n.__("UnitReceiptNote.storage.shouldNot:%s unit name is not matched with unit name", i18n.__("UnitReceiptNote.storage._:Storage")); //"Nama unit storage tidak sama dengan nama unit";
                                }
                            }
                        }
                    }

                    if (valid.deliveryOrder) {
                        if (!valid.deliveryOrder._id)
                            errors["deliveryOrder"] = i18n.__("UnitReceiptNote.deliveryOrder.isRequired:%s is required", i18n.__("UnitReceiptNote.deliveryOrder._:Delivery Order No")); //"No. surat jalan tidak boleh kosong";
                        var doDate = new Date(valid.deliveryOrder.date);
                        var validDate = new Date(valid.date);
                        if (validDate < doDate)
                            errors["date"] = i18n.__("DeliveryOrder.date.isGreater:%s is less than delivery order date", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
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
                    if(valid.isInventory){
                        if(_storage){
                            valid.storageId=new ObjectId(_storage._id);
                            valid.storageName= _storage.name;
                            valid.storageCode=_storage.code;
                        }
                    }
                    else{
                        valid.storageId=null;
                        valid.storageName="";
                        valid.storageCode="";
                    }

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
                        item.deliveredQuantity = Number(item.deliveredQuantity);
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

    _beforeInsert(unitReceiptNote) {
        var monthNow = moment(unitReceiptNote.date).format("MM");
        var yearNow = parseInt(moment(unitReceiptNote.date).format("YY"));
        var code="";
        var unitCode=unitReceiptNote.unit ? unitReceiptNote.unit.code : "";
        if(unitReceiptNote && unitReceiptNote.supplier){
            code= unitReceiptNote.supplier.import ? "BPI" : "BPL";
        }
        var type = code+monthNow+yearNow+unitCode;
        var query = { "type": type, "description": NUMBER_DESCRIPTION };
        var fields = { "number": 1, "year": 1 };

        return this.documentNumbers
            .findOne(query, fields)
            .then((previousDocumentNumber) => {

                var number = 1;

                if (!unitReceiptNote.no) {
                    if (previousDocumentNumber) {
                        var oldYear = previousDocumentNumber.year;
                        number = yearNow > oldYear ? number : previousDocumentNumber.number + 1;

                        unitReceiptNote.no = `${yearNow}-${monthNow}-${code}-${unitCode}-${this.pad(number, 3)}`;
                    } else {
                        unitReceiptNote.no = `${yearNow}-${monthNow}-${code}-${unitCode}-001`;
                    }
                }

                var documentNumbersData = {
                    type: type,
                    documentNumber: unitReceiptNote.no,
                    number: number,
                    year: yearNow,
                    description: NUMBER_DESCRIPTION
                };

                var options = { "upsert": true };

                return this.documentNumbers
                    .updateOne(query, documentNumbersData, options)
                    .then((id) => {
                        return Promise.resolve(unitReceiptNote);
                    })
            })
    }
    
    pad(number, length) {

        var str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }

        return str;
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((unitReceiptNote) => this.updatePurchaseOrder(unitReceiptNote))
            .then((unitReceiptNote) => this.updateDeliveryOrder(unitReceiptNote))
            .then((unitReceiptNote) => {
                if(ObjectId.isValid(unitReceiptNote.storageId)){
                    return this.storageManager.getSingleByIdOrDefault(unitReceiptNote.storageId)
                    .then(storage=>{
                        var temp = {};
                        var index=0;
                        var obj=null;
                        for(var i=0; i < unitReceiptNote.items.length; i++) {
                            index=i;
                            obj={
                                productId:unitReceiptNote.items[i].product._id.toString(),
                                quantity:unitReceiptNote.items[i].deliveredQuantity,
                                uomId:unitReceiptNote.items[i].deliveredUom._id,
                                remark: unitReceiptNote.items[i].deliveredQuantity + " " + unitReceiptNote.items[i].remark
                            };
                            //obj=unitReceiptNote.items[i];
                            var dup = unitReceiptNote.items.find((test, idx) => 
                            obj.productId.toString() === test.product._id.toString() && obj.uomId.toString() === test.deliveredUom._id.toString() && index != idx);
                            if(!dup) {
                                temp[obj.productId+obj.uomId.toString()] = obj;
                            } else {
                                if(!temp[obj.productId+obj.uomId.toString()]) {
                                    temp[obj.productId+obj.uomId.toString()] = obj;
                                } else {
                                    temp[obj.productId+obj.uomId.toString()].remark += "; " + obj.remark ;
                                    temp[obj.productId+obj.uomId.toString()].quantity += obj.quantity;
                                }
                            }
                        }
                        var result = [];
                        for (var prop in temp)
                            result.push(temp[prop]);
                        // var items=[];
                        // for(var a of unitReceiptNote.items){
                        //     var item={
                        //         productId:a.product._id.toString(),
                        //         quantity:a.deliveredQuantity,
                        //         uomId:a.deliveredUom._id,
                        //         remark:a.remark
                        //     };
                        //     items.push(item);
                        // }
                        var unit=unitReceiptNote.unit.name;
                        var doc={
                            date:unitReceiptNote.date,
                            referenceNo: unitReceiptNote.no,
                            referenceType:"Bon Terima Unit " + unit,
                            type:"IN",
                            storageId:storage._id,
                            remark:unitReceiptNote.remark,
                            items:result
                        }
                    
                        return this.textileInventoryDocumentManager.create(doc)
                        .then( ()=> { 
                            return this.syncItems(id);
                        });
                    })
                }
                else{
                    return this.syncItems(id);
                }
            })
    }

    _beforeUpdate(data) {
        return this.getSingleById(data._id)
            .then((unitReceiptNote) => this.updatePurchaseOrderDeleteUnitReceiptNote(unitReceiptNote))
            .then((unitReceiptNote) => this.updateDeliveryOrderDeleteUnitReceiptNote(unitReceiptNote))
            .then(unitReceiptNote => {
                if (ObjectId.isValid(unitReceiptNote.storageId)) {
                    return this.storageManager.getSingleByIdOrDefault(unitReceiptNote.storageId)
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
                                referenceType: "Bon Terima Unit Garment",
                                type: "OUT",
                                storageId: storage._id,
                                remark: unitReceiptNote.remark,
                                items: items
                            }

                            return this.textileInventoryDocumentManager.create(doc)
                                .then((id) => {
                                    return Promise.resolve(data);
                                });
                        });
                }
                else {
                    return Promise.resolve(data);
                }
            });
    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((unitReceiptNote) => this.updatePurchaseOrderUpdateUnitReceiptNote(unitReceiptNote))
            .then((unitReceiptNote) => this.updateDeliveryOrderUpdateUnitReceiptNote(unitReceiptNote))
            .then((unitReceiptNote) => {
                if(ObjectId.isValid(unitReceiptNote.storageId)){
                    return this.storageManager.getSingleByIdOrDefault(unitReceiptNote.storageId)
                    .then(storage=>{
                        var temp = {};
                        var index=0;
                        var obj=null;
                        for(var i=0; i < unitReceiptNote.items.length; i++) {
                            index=i;
                            obj={
                                productId:unitReceiptNote.items[i].product._id.toString(),
                                quantity:unitReceiptNote.items[i].deliveredQuantity,
                                uomId:unitReceiptNote.items[i].deliveredUom._id,
                                remark: unitReceiptNote.items[i].deliveredQuantity + " " + unitReceiptNote.items[i].remark
                            };
                            //obj=unitReceiptNote.items[i];
                            var dup = unitReceiptNote.items.find((test, idx) => 
                            obj.productId.toString() === test.product._id.toString() && obj.uomId.toString() === test.deliveredUom._id.toString() && index != idx);
                            if(!dup) {
                                temp[obj.productId+obj.uomId.toString()] = obj;
                            } else {
                                if(!temp[obj.productId+obj.uomId.toString()]) {
                                    temp[obj.productId+obj.uomId.toString()] = obj;
                                } else {
                                    temp[obj.productId+obj.uomId.toString()].remark += "; " + obj.remark ;
                                    temp[obj.productId+obj.uomId.toString()].quantity += obj.quantity;
                                }
                            }
                        }
                        var items = [];
                        for (var prop in temp)
                            items.push(temp[prop]);

                        var unit=unitReceiptNote.unit.name;
                        var doc={
                            date:unitReceiptNote.date,
                            referenceNo: unitReceiptNote.no,
                            referenceType:"Bon Terima Unit "+ unit,
                            type:"IN",
                            storageId:storage._id,
                            remark:unitReceiptNote.remark,
                            items:items
                        }
                    
                        return this.textileInventoryDocumentManager.create(doc)
                        .then( ()=> { 
                            return this.syncItems(id);
                        });
                    });
                }
                else{
                    return this.syncItems(id);
                }
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
                            var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.deliveryOrderNo.toString() === unitReceiptNote.deliveryOrder.no.toString());
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
                        purchaseOrder.status =(totalReceived === totalDealQuantity ? poStatusEnum.RECEIVED : poStatusEnum.RECEIVING);
                        // purchaseOrder.status = purchaseOrder.purchaseRequest.internal == true ? poStatusEnum.COMPLETE : (totalReceived === totalDealQuantity ? poStatusEnum.RECEIVED : poStatusEnum.RECEIVING);
                        // purchaseOrder.status = fulfillment.unitReceiptNoteDeliveredQuantity < fulfillment.deliveryOrderDeliveredQuantity ? poStatusEnum.RECEIVING : purchaseOrder.status;
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
                            var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.deliveryOrderNo.toString() === unitReceiptNote.deliveryOrder.no.toString() && fulfillment.unitReceiptNoteNo === unitReceiptNote.no);
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
                        // purchaseOrder.status = fulfillment.unitReceiptNoteDeliveredQuantity < fulfillment.deliveryOrderDeliveredQuantity ? poStatusEnum.RECEIVING : purchaseOrder.status;
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

        var jobs = [];
        map.forEach((items, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    for (var item of items) {
                        var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === item.productId.toString());
                        if (poItem) {
                            var listDo = poItem.fulfillments
                                .map((fulfillment) => {
                                    if (fulfillment.deliveryOrderNo.toString() === unitReceiptNote.deliveryOrder.no.toString()) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                })
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);

                            var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.deliveryOrderNo.toString() === unitReceiptNote.deliveryOrder.no.toString() && fulfillment.unitReceiptNoteNo === unitReceiptNote.no);
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
                        purchaseOrder.status = poStatus ? poStatusEnum.RECEIVING : (unitReceiptNote.deliveryOrder.isClosed ? poStatusEnum.ARRIVED : poStatusEnum.ARRIVING);
                    } return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(unitReceiptNote);
        })
    }

    updateDeliveryOrder(unitReceiptNote) {
        return this.deliveryOrderManager.syncItems(unitReceiptNote.deliveryOrderId)
            .then((deliveryOrderId) => this.deliveryOrderManager.getSingleByQueryOrDefault({ _id: ObjectId.isValid(deliveryOrderId) ? new ObjectId(deliveryOrderId) : {} }))
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
        return this.deliveryOrderManager.syncItems(unitReceiptNote.deliveryOrderId)
            .then((deliveryOrderId) => this.deliveryOrderManager.getSingleByQueryOrDefault({ _id: ObjectId.isValid(deliveryOrderId) ? new ObjectId(deliveryOrderId) : {} }))
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
        return this.deliveryOrderManager.syncItems(unitReceiptNote.deliveryOrderId)
            .then((deliveryOrderId) => this.deliveryOrderManager.getSingleByQueryOrDefault({ _id: ObjectId.isValid(deliveryOrderId) ? new ObjectId(deliveryOrderId) : {} }))
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

    syncItems(id) {
        var query = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
        };
        return this.getSingleByQuery(query)
            .then((unitReceiptNote) => {
                var getPoInternals = unitReceiptNote.items.map((item) => {
                    return this.purchaseOrderManager.getSingleById(item.purchaseOrderId,this.purchaseOrderFields)
                })
                return this.deliveryOrderManager.getSingleById(unitReceiptNote.deliveryOrderId,this.deliveryOrderFields)
                    .then((deliveryOrder) => {
                        return Promise.all(getPoInternals)
                            .then((purchaseOrderInternals) => {
                                for (var item of unitReceiptNote.items) {
                                    var purchaseOrderInternal = purchaseOrderInternals.find(purchaseOrderInternal => item.purchaseOrderId.toString() === purchaseOrderInternal._id.toString())
                                    item.purchaseOrder = purchaseOrderInternal;
                                }
                                unitReceiptNote.deliveryOrder = deliveryOrder;
                                return this.collection
                                    .updateOne({
                                        _id: unitReceiptNote._id
                                    }, {
                                        $set: unitReceiptNote
                                    })
                                    .then((result) => Promise.resolve(unitReceiptNote._id));
                            })
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
                            .then((unitReceiptNote) => {
                                if(ObjectId.isValid(unitReceiptNote.storageId)){
                                    return this.storageManager.getSingleByIdOrDefault(unitReceiptNote.storageId)
                                    .then(storage=>{
                                        var temp = {};
                                        var index=0;
                                        var obj=null;
                                        for(var i=0; i < unitReceiptNote.items.length; i++) {
                                            index=i;
                                            obj={
                                                productId:unitReceiptNote.items[i].product._id.toString(),
                                                quantity:unitReceiptNote.items[i].deliveredQuantity,
                                                uomId:unitReceiptNote.items[i].deliveredUom._id,
                                                remark: unitReceiptNote.items[i].deliveredQuantity + " " + unitReceiptNote.items[i].remark
                                            };
                                            //obj=unitReceiptNote.items[i];
                                            var dup = unitReceiptNote.items.find((test, idx) => 
                                            obj.productId.toString() === test.product._id.toString() && obj.uomId.toString() === test.deliveredUom._id.toString() && index != idx);
                                            if(!dup) {
                                                temp[obj.productId+obj.uomId.toString()] = obj;
                                            } else {
                                                if(!temp[obj.productId+obj.uomId.toString()]) {
                                                    temp[obj.productId+obj.uomId.toString()] = obj;
                                                } else {
                                                    temp[obj.productId+obj.uomId.toString()].remark += "; " + obj.remark ;
                                                    temp[obj.productId+obj.uomId.toString()].quantity += obj.quantity;
                                                }
                                            }
                                        }
                                        var items = [];
                                        for (var prop in temp)
                                            items.push(temp[prop]);

                                        var unit=unitReceiptNote.unit.name;    
                                        var doc={
                                            date:unitReceiptNote.date,
                                            referenceNo: unitReceiptNote.no,
                                            referenceType:"Bon Terima Unit "+ unit,
                                            type:"OUT",
                                            storageId:storage._id,
                                            remark:unitReceiptNote.remark,
                                            items:items
                                        }
                                    
                                        return this.textileInventoryDocumentManager.create(doc)
                                        .then( ()=> { 
                                            return this.syncItems(id);
                                        });
                                    });
                                }
                                else{
                                    return this.syncItems(id);
                                }
                            });
                            
                    });
            });
    }

    pdf(id, offset) {
        return new Promise((resolve, reject) => {
            this.getSingleById(id)
                .then(unitReceiptNote => {
                    var getDefinition = require('../../pdf/definitions/unit-receipt-note');
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
                .catch(e => {
                    reject(e);
                });

        });
    }

    getUnitReceiptNotes(_no, _PRNo, _unitId, _categoryId, _supplierId, _dateFrom, _dateTo, offset,  createdBy) {
        return new Promise((resolve, reject) => {
            var query = Object.assign({});

            var deleted = { _deleted: false };

            if (_no !== "undefined" && _no !== "") {
                var no = { no: _no };
                Object.assign(query, no);
            }
            if (_PRNo !== "undefined" && _PRNo !== "") {
                var PRNo = { 
                    "items": {
                        $elemMatch: {
                            "purchaseOrder.purchaseRequest.no": _PRNo
                        }
                    }
                };
                Object.assign(query, PRNo);
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
    }

    getUnitReceiptWithoutSpb(_unitId, staffName , _dateFrom, _dateTo, offset) 
    {
        return new Promise((resolve, reject) => 
        {
            var doColl = map.purchasing.collection.DeliveryOrder; 
            var query = Object.assign({});                      
            var deleted = { _deleted: false };
            var bayar = {isPaid: false};     

            if (_unitId !== "undefined" && _unitId !== "") {
                var unitId = { unitId: new ObjectId(_unitId) };
                Object.assign(query, unitId);
            }

            if (staffName !== undefined && staffName !== "") {
                var myStap = staffName;                
            }
                                
            if (_dateFrom !== "undefined" && _dateFrom !== "null" && _dateFrom !== "" && _dateTo !== "undefined" && _dateTo !== "null" && _dateTo !== "")
            {
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
            
            Object.assign(query, deleted);
            Object.assign(query, bayar);
            
            this.collection.aggregate(                
              {$match: query}
                , {
                    $lookup : {
                                from: doColl, 
                                localField: "deliveryOrder.no",
                                foreignField: "no",
                                as: "jeneng"
                              }
                    
                },{
                    $unwind:"$jeneng"
                }
                ,{$match: {"jeneng._createdBy": myStap}}
                ,{
                    $project:{
                                "divisi":"$unit.division.name",
                                "asmo":"$unit.name",
                                "supp":"$supplier.name",
                                "setap": "$jeneng._createdBy",
                                "sj":"$jeneng.no",
                                "tglsj":"$jeneng.date",
                                "bon":"$no",
                                "tglbon":"$date",
                                "adm":"$_createdBy" 
                             }
                }
            ).toArray().then(product=>{
                    resolve(product);
                });        
            });
        }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.UnitReceiptNote}_date`,
            key: {
                date: -1
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
};