"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../../utils/code-generator");

var PackingManager = require('../../production/finishing-printing/packing-manager');
var ProductManager = require('../../master/product-manager');
var StorageManager = require('../../master/storage-manager');
var InventoryDocumentManager = require('../inventory-document-manager');
var InventoryMovementManager = require('../inventory-movement-manager');
var PackingReceiptManager= require('./fp-packing-receipt-manager');
var InventorySummaryManager = require('../inventory-summary-manager');
var MaterialConstructionManager=require('../../master/material-construction-manager');
var ProductionOrderManager = require('../../sales/production-order-manager');

var Models = require("dl-models");
var Map = Models.map;
var FPReturToQCDoc = Models.inventory.finishingPrinting.FPReturToQCDoc;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class FPReturToQCDocManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.inventory.finishingPrinting.collection.FPReturToQCDoc);
        this.productColl=this.db.collection(Map.master.collection.Product);
        this.invSummaryColl=this.db.collection(Map.inventory.collection.InventorySummary);
        this.invDocumentColl=this.db.collection(Map.inventory.collection.InventoryDocument);
        this.invMovementColl=this.db.collection(Map.inventory.collection.InventoryMovement);

        this.packingManager = new PackingManager(db, user);
        this.productManager = new ProductManager(db, user);
        this.storageManager = new StorageManager(db, user);
        this.inventoryDocumentManager = new InventoryDocumentManager(db, user);
        this.packingReceiptManager=new PackingReceiptManager(db,user);
        this.materialConstructionManager=new MaterialConstructionManager(db,user);
        this.productionOrderManager = new ProductionOrderManager(db,user);
        this.inventoryMovementManager = new InventoryMovementManager(db, user);
        this.inventorySummaryManager = new InventorySummaryManager(db, user);
    }

    _getQuery(paging) {
        var _default = {
            _deleted: false
        },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var returNoFilter = {
                "returNo": {
                    "$regex": regex
                }
            };
            var doFilter = {
                "deliveryOrderNo": {
                    "$regex": regex
                }
            };
            var destinationFilter = {
                "destination": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [returNoFilter, doFilter, destinationFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.returNo = generateCode();
        return Promise.resolve(data);
    }

    _validate(retur) {
        var errors = {};
        var valid = retur;

        var getReturDoc = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            returNo: valid.returNo
        });
        var getMaterial= valid.materialId && ObjectId.isValid(valid.materialId) ? this.productManager.getSingleByIdOrDefault(valid.materialId) : Promise.resolve(null);
        var getConstruction = valid.materialConstructionId && ObjectId.isValid(valid.materialConstructionId) ? this.materialConstructionManager.getSingleByIdOrDefault(valid.materialConstructionId) : Promise.resolve(null);

        valid.items = valid.items || [];
        var getPackings = [];
        for (var item of valid.items) {
            if (ObjectId.isValid(item.packingId)) {
                var packing = ObjectId.isValid(item.packingId) ? this.packingManager.getSingleByIdOrDefault(item.packingId) : Promise.resolve(null);
                getPackings.push(packing);
            }
        }
        return Promise.all([getReturDoc,getMaterial, getConstruction].concat(getPackings))
            .then((results) => {
                var _retur=results[0];
                var _material=results[1];
                var _construction=results[2];
                var _packings = results.slice(3, 3 + results.length);

                valid.date=new Date(valid.date);
                if (_retur)
                    errors["returNo"] = i18n.__("FPReturToQCDoc.returNo.isExist: %s is exist", i18n.__("FPReturToQCDoc.returNo._:ReturNo"));
                
                if(!valid.materialId || valid.materialId===''){
                     errors["materialId"] = i18n.__("FPReturToQCDoc.materialId.isRequired:%s is required", i18n.__("FPReturToQCDoc.materialId._:Material")); //"Material harus diisi"; 
                }
                else if(!_material){
                    errors["materialId"] = i18n.__("FPReturToQCDoc.materialId: %s not found", i18n.__("FPReturToQCDoc.materialId._:Material"));
                }

                if(!valid.materialConstructionId || valid.materialConstructionId===''){
                     errors["materialConstructionId"] = i18n.__("FPReturToQCDoc.materialConstructionId.isRequired:%s is required", i18n.__("FPReturToQCDoc.materialConstructionId._:Construction")); //"Construction harus diisi"; 
                }
                else if(!_construction){
                    errors["materialConstructionId"] = i18n.__("FPReturToQCDoc.materialConstructionId: %s not found", i18n.__("FPReturToQCDoc.materialConstructionId._:Construction"));
                }

                if(!valid.destination || valid.destination===''){
                     errors["destination"] = i18n.__("FPReturToQCDoc.destination.isRequired:%s is required", i18n.__("FPReturToQCDoc.destination._:Destination")); //"destination harus diisi"; 
                }

                if(!valid.date || valid.date===''){
                     errors["date"] = i18n.__("FPReturToQCDoc.date.isRequired:%s is required", i18n.__("FPReturToQCDoc.date._:Date")); //"Date harus diisi"; 
                }

                if(!valid.materialWidthFinish || valid.materialWidthFinish===''){
                     errors["materialWidthFinish"] = i18n.__("FPReturToQCDoc.materialWidthFinish.isRequired:%s is required", i18n.__("FPReturToQCDoc.materialWidthFinish._:MaterialWidthFinish")); //"materialWidthFinish harus diisi"; 
                }

                if (valid.items && valid.items.length > 0) {
                    var itemErrors = [];
                    var index=0;
                    for (var item of valid.items) {
                        var itemError = {};
                        if (!item.productionOrderNo || item.productionOrderNo=="")
                            itemError["productionOrderNo"] = i18n.__("FPReturToQCDoc.items.productionOrderNo.isRequired:%s is required", i18n.__("FPReturToQCDoc.items.productionOrderNo._:ProductionOrderNo")); //"productionOrderNo tidak boleh kosong";
                        else if(!_packings[index]){
                            itemError["productionOrderNo"] = i18n.__("FPReturToQCDoc.items.productionOrderNo.isRequired:%s is required", i18n.__("FPReturToQCDoc.items.productionOrderNo._:ProductionOrderNo")); //"productionOrderNo tidak boleh kosong";
                        }
                        else if(item.details.length<=0){
                            itemError["productionOrderNo"] = i18n.__("FPReturToQCDoc.items.shouldNot:%s should not be empty", i18n.__("FPReturToQCDoc.items._:Items"));
                        }

                        if(item.details.length>0){
                            var detailErrors=[];
                            var isEmpty=0;
                            var details=[];
                            for(var detail of item.details){
                                if(detail.returQuantity>0){
                                    details.push(detail);
                                }
                                
                            }
                            
                            if(details.length<=0){
                                for(var detail of item.details){
                                    var detailError={};
                                    if(detail.quantityBefore>0){
                                        detailError["returQuantity"] = i18n.__("FPReturToQCDoc.items.details.returQuantity.isRequired:%s is required", i18n.__("FPReturToQCDoc.items.details.returQuantity._:returQuantity")); //"returQuantity tidak boleh lebih dari stockQuantity";
                                        detailErrors.push(detailError);
                                    }
                                    
                                }
                            }
                            else{
                                item.details=details;
                                for(var detail of details){
                                    var detailError={};
                                    if(detail.quantityBefore< detail.returQuantity){
                                        detailError["returQuantity"] = i18n.__("FPReturToQCDoc.items.details.returQuantity.shouldNot:%s should not be more than stockQuantity", i18n.__("FPReturToQCDoc.items.details.returQuantity._:returQuantity")); //"returQuantity tidak boleh lebih dari stockQuantity";
                                    }

                                    if(!detail.remark || detail.remark==""){
                                        detailError["remark"] = i18n.__("FPReturToQCDoc.items.details.remark.isRequired:%s is required", i18n.__("FPReturToQCDoc.items.details.remark._:remark")); //"remark tidak boleh kosong";
                                    }

                                    if(!detail.length || detail.length<=0){
                                        detailError["length"] = i18n.__("FPReturToQCDoc.items.details.length.isRequired:%s is required", i18n.__("FPReturToQCDoc.items.details.length._:length")); //"length tidak boleh kosong";
                                    }

                                    if(!detail.weight || detail.weight<=0){
                                        detailError["weight"] = i18n.__("FPReturToQCDoc.items.details.weight.isRequired:%s is required", i18n.__("FPReturToQCDoc.items.details.weight._:weight")); //"weight tidak boleh kosong";
                                    }
                                    
                                    if(item.details.length===isEmpty){
                                        detailError["returQuantity"] = i18n.__("FPReturToQCDoc.items.details.returQuantity.isRequired:%s is required", i18n.__("FPReturToQCDoc.items.details.returQuantity._:returQuantity")); //"returQuantity tidak boleh lebih dari stockQuantity";
                                    }
                                    detailErrors.push(detailError);
                                }
                            }
                        }

                        for (var errorDetail of detailErrors) {
                            if (Object.getOwnPropertyNames(errorDetail).length > 0) {
                                itemError.details=detailErrors;
                                break;
                            }
                        }

                        itemErrors.push(itemError);
                        index++;
                    }

                    for (var itemError of itemErrors) {
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            errors.items = itemErrors;
                            break;
                        }
                    }
                    
                }
                
                if(_material){
                    valid.materialId=new ObjectId(_material._id);
                    valid.materialName=_material.name;
                    valid.materialCode=_material.code;
                }
                if(_construction){
                    valid.materialConstructionId=new ObjectId(_construction._id);
                    valid.materialConstructionName=_construction.name;
                    valid.materialConstructionCode=_construction.code;
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (!valid.stamp){
                    valid = new FPReturToQCDoc(valid);
                }

                valid.stamp(this.user.username, "manager");
                
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.inventory.finishingPrinting.collection.FPReturToQCDoc}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var codeIndex = {
            name: `ix_${Map.inventory.finishingPrinting.collection.FPReturToQCDoc}_returNo`,
            key: {
                returNo: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    getProductByProductionOrder(productionOrderId){
        return new Promise((resolve, reject) => {
            var query={};
            var _defaultFilter = {
                _deleted: false
            };
            var orderIdFilter={
                "properties.productionOrderId":new ObjectId(productionOrderId)
            };
            // var inventoriesIdFilter={
            //     "$inventory": { $ne: [] }
            // }
            query = { '$and': [_defaultFilter,orderIdFilter] };
            var inventoryColl=Map.inventory.collection.InventorySummary;

            this.productColl.aggregate([  
                    {$lookup: {from: inventoryColl,localField: "_id",foreignField: "productId",as: "inventory"}},
                    {$match:query},
                    {$sort : {"_createdDate" : -1}}
                ])
                .toArray().then(product=>{
                    resolve(product);
                });
        });
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((retur) => {
                var docs=[];
                for(var a of retur.items){
                    var itemDocs=[];
                    for(var b of a.details){
                        var items = {
                            productId:b.productId.toString(),
                            uomId: b.uomId.toString(),
                            quantity: b.returQuantity
                        }
                        var storage=b.storageId.toString();
                        itemDocs.push(items);
                    }
                    var createDocuments={
                        storageId:storage,
                        referenceNo:retur.returNo + " - " + a.productionOrderNo,
                        referenceType:"retur-to-qc",
                        items: itemDocs,
                        type:"OUT"
                    }
                    var createOutMove= this.inventoryDocumentManager.create(createDocuments);
                    docs.push(createOutMove);
                }

                return Promise.all(docs);
            })
            .then(results => id);
    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((retur) => {
                var docs=[];
                for(var a of retur.items){
                    var itemDocs=[];
                    for(var b of a.details){
                        var items = {
                            productId:b.productId.toString(),
                            uomId: b.uomId.toString(),
                            quantity: b.returQuantity
                        }
                        var storage=b.storageId.toString();
                        itemDocs.push(items);
                    }
                    var createDocuments={
                        storageId:storage,
                        referenceNo:retur.returNo + " - " + a.productionOrderNo,
                        referenceType:"retur-to-qc",
                        items: itemDocs,
                        type:"IN"
                    }
                    var createOutMove= this.inventoryDocumentManager.create(createDocuments);
                    docs.push(createOutMove);
                }

                return Promise.all(docs);
            })
            .then(results => id);
    }

    

    pdf(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(purchaseRequest => {
                    var getDefinition = require("../../../pdf/definitions/fp-retur-to-qc-doc");
                    var definition = getDefinition(purchaseRequest, offset);

                    var generatePdf = require("../../../pdf/pdf-generator");
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
}