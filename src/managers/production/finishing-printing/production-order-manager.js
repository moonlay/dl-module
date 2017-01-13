'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var SalesContract=DLModels.production.finishingPrinting.SalesContract;
var DailyOperation=DLModels.production.finishingPrinting.DailyOperation;
var ProductionOrder=DLModels.production.finishingPrinting.ProductionOrder;
var ProductionOrderDetail=DLModels.production.finishingPrinting.ProductionOrderDetail;
var DailyOperation=DLModels.production.finishingPrinting.DailyOperation;
var LampStandardManager=require('../../master/lamp-standard-manager');
var BuyerManager=require('../../master/buyer-manager');
var UomManager = require('../../master/uom-manager');
var ProductManager = require('../../master/product-manager');
var ProcessTypeManager = require('../../master/process-type-manager');
var OrderTypeManager = require('../../master/order-type-manager');
var ColorTypeManager = require('../../master/color-type-manager');
var InstructionManager = require('../../master/instruction-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var generateCode = require("../../../utils/code-generator");
var DailyOperationCollection=null;
var assert = require('assert');

module.exports = class ProductionOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        
        this.collection = this.db.collection(map.production.finishingPrinting.collection.SalesContract);
        DailyOperationCollection=this.db.collection(map.production.finishingPrinting.collection.DailyOperation);
        this.LampStandardManager = new LampStandardManager(db, user);
        this.BuyerManager= new BuyerManager(db,user);
        this.UomManager = new UomManager(db, user);
        this.ProductManager = new ProductManager(db, user);
        this.InstructionManager = new InstructionManager(db, user);
        this.ProcessTypeManager = new ProcessTypeManager(db, user);
        this.ColorTypeManager = new ColorTypeManager(db, user);
        this.OrderTypeManager = new OrderTypeManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterSalesContract = {
                'salesContractNo': {
                    '$regex': regex
                }
            };
           

            keywordFilter = {
                '$or': [filterSalesContract]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

     _validate(productionOrder) {
        var errors = {};

        var valid=productionOrder;
        if(valid.constructionId){
            valid.construction=valid.construction._id;}

        var getBuyer = ObjectId.isValid(valid.buyerId) ? this.BuyerManager.getSingleByIdOrDefault(valid.buyerId) : Promise.resolve(null);
        var getLampStandard = ObjectId.isValid(valid.lampStandardId) ? this.LampStandardManager.getSingleByIdOrDefault(valid.lampStandardId) : Promise.resolve(null);
        var getUom = valid.uom && ObjectId.isValid(valid.uomId) ? this.UomManager.getSingleByIdOrDefault(valid.uomId) : Promise.resolve(null);
        var getProduct = ObjectId.isValid(valid.materialId) ? this.ProductManager.getSingleByIdOrDefault(valid.materialId) : Promise.resolve(null);
        var getProcessType = ObjectId.isValid(valid.processTypeId) ? this.ProcessTypeManager.getSingleByIdOrDefault(valid.processTypeId) : Promise.resolve(null);
        var getOrderType = ObjectId.isValid(valid.orderTypeId) ? this.OrderTypeManager.getSingleByIdOrDefault(valid.orderTypeId) : Promise.resolve(null);

        valid.details = valid.details || [];
        var getColorTypes = [];
        for (var detail of valid.details) {
            if (ObjectId.isValid(detail.colorTypeId)) {
                var color=ObjectId.isValid(detail.colorTypeId) ? this.ColorTypeManager.getSingleByIdOrDefault(detail.colorTypeId) : Promise.resolve(null);
                getColorTypes.push(color);
            }
        }

        return Promise.all([getBuyer, getLampStandard, getUom,  getProduct, getProcessType, getOrderType].concat(getColorTypes))
            .then(results => {
                var _buyer = results[0];
                var _lampStandard = results[1];
                var _uom = results[2];
                var _material = results[3];
                var _process = results[4];
                var _order = results[5];
                var _colors = results.slice(6, results.length);


                if (valid.uom) {
                    if (!valid.uom.unit || valid.uom.unit == '')
                        errors["uom"] = i18n.__("ProductionOrder.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";
                }
                else
                    errors["uom"] = i18n.__("ProductionOrder.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";

                if(!valid.salesContractNo || valid.salesContractNo===''){
                    errors["salesContractNo"]=i18n.__("ProductionOrder.salesContractNo.isRequired:%s is required", i18n.__("ProductionOrder.salesContractNo._:SalesContractNo")); //"salesContractNo tidak boleh kosong";
                }

                if(!valid.construction || valid.construction===''){
                    errors["construction"]=i18n.__("ProductionOrder.construction.isRequired:%s is required", i18n.__("ProductionOrder.construction._:Construction")); //"construction tidak boleh kosong";
                }

                if (!_material)
                    errors["material"] = i18n.__("ProductionOrder.material.isRequired:%s is not exists", i18n.__("ProductionOrder.material._:Material")); //"material tidak boleh kosong";
                else if (!valid.materialId)
                    errors["material"] = i18n.__("ProductionOrder.material.isRequired:%s is required", i18n.__("ProductionOrder.material._:Material")); //"material tidak boleh kosong";

                if (!_process)
                    errors["processType"] = i18n.__("ProductionOrder.processType.isRequired:%s is not exists", i18n.__("ProductionOrder.processType._:ProcessType")); //"processType tidak boleh kosong";
                else if (!valid.processTypeId)
                    errors["processType"] = i18n.__("ProductionOrder.processType.isRequired:%s is required", i18n.__("ProductionOrder.processType._:ProcessType")); //"processType tidak boleh kosong";
                
                if (!_order)
                    errors["orderType"] = i18n.__("ProductionOrder.orderType.isRequired:%s is not exists", i18n.__("ProductionOrder.orderType._:OrderType")); //"orderType tidak boleh kosong";
                else if (!valid.processTypeId)
                    errors["orderType"] = i18n.__("ProductionOrder.orderType.isRequired:%s is required", i18n.__("ProductionOrder.orderType._:OrderType")); //"orderType tidak boleh kosong";

                if(!valid.rollLength || valid.rollLength===''){
                    errors["rollLength"]=i18n.__("ProductionOrder.rollLength.isRequired:%s is required", i18n.__("ProductionOrder.rollLength._:RollLength")); //"rollLength tidak boleh kosong";
                }

                if(!valid.originGreigeFabric || valid.originGreigeFabric===''){
                    errors["originGreigeFabric"]=i18n.__("ProductionOrder.originGreigeFabric.isRequired:%s is required", i18n.__("ProductionOrder.originGreigeFabric._:OriginGreigeFabric")); //"originGreigeFabric tidak boleh kosong";
                }

                if(!valid.finishWidth || valid.finishWidth===''){
                    errors["finishWidth"]=i18n.__("ProductionOrder.finishWidth.isRequired:%s is required", i18n.__("ProductionOrder.finishWidth._:FinishWidth")); //"finishWidth tidak boleh kosong";
                }

                if(!valid.sample || valid.sample===''){
                    errors["sample"]=i18n.__("ProductionOrder.sample.isRequired:%s is required", i18n.__("ProductionOrder.sample._:Sample")); //"sample tidak boleh kosong";
                }

                if(!valid.handlingStandard || valid.handlingStandard===''){
                    errors["handlingStandard"]=i18n.__("ProductionOrder.handlingStandard.isRequired:%s is required", i18n.__("ProductionOrder.handlingStandard._:HandlingStandard")); //"handlingStandard tidak boleh kosong";
                }

                if(!valid.shrinkageStandard || valid.shrinkageStandard===''){
                    errors["shrinkageStandard"]=i18n.__("ProductionOrder.shrinkageStandard.isRequired:%s is required", i18n.__("ProductionOrder.shrinkageStandard._:ShrinkageStandard")); //"shrinkageStandard tidak boleh kosong";
                }

                if (!valid.deliveryDate || valid.deliveryDate === "") {
                     errors["deliveryDate"] = i18n.__("ProductionOrder.deliveryDate.isRequired:%s is required", i18n.__("ProductionOrder.deliveryDate._:deliveryDate")); //"Buyer tidak boleh kosong";
                }

                if (!_buyer)
                    errors["buyer"] = i18n.__("ProductionOrder.buyer.isRequired:%s is not exists", i18n.__("ProductionOrder.buyer._:Buyer")); //"Buyer tidak boleh kosong";
                else if (!valid.buyerId)
                    errors["buyer"] = i18n.__("ProductionOrder.buyer.isRequired:%s is required", i18n.__("ProductionOrder.buyer._:Buyer")); //"Buyer tidak boleh kosong";

                if(!_lampStandard)
                    errors["lampStandard"] = i18n.__("ProductionOrder.lampStandard.isRequired:%s is not exists", i18n.__("ProductionOrder.lampStandard._:LampStandard")); //"lampStandard tidak boleh kosong";
                else if (!valid.lampStandardId)
                    errors["lampStandard"] = i18n.__("ProductionOrder.lampStandard.isRequired:%s is required", i18n.__("ProductionOrder.lampStandard._:LampStandard")); //"lampStandard tidak boleh kosong";
                
                 if (!valid.orderQuantity || valid.orderQuantity === 0)
                    errors["orderQuantity"] = i18n.__("ProductionOrder.orderQuantity.isRequired:%s is required", i18n.__("ProductionOrder.orderQuantity._:OrderQuantity")); //"orderQuantity tidak boleh kosong";
                    else 
                        {
                            var totalqty=0;
                            if(valid.details.length>0){
                                for(var i of valid.details){
                                    totalqty+=i.quantity;
                                }
                            }
                            if(valid.orderQuantity!=totalqty){
                                errors["orderQuantity"] = i18n.__("ProductionOrder.orderQuantity.shouldNot:%s should equal SUM quantity in details", i18n.__("ProductionOrder.orderQuantity._:OrderQuantity")); //"orderQuantity tidak boleh berbeda dari total jumlah detail";
                        }
                    }
                
                if (!valid.spelling || valid.spelling === 0)
                    errors["spelling"] = i18n.__("ProductionOrder.spelling.isRequired:%s is required", i18n.__("ProductionOrder.spelling._:Spelling")); //"spelling tidak boleh kosong";
                
                valid.details = valid.details || [];
                if (valid.details && valid.details.length <= 0) {
                    errors["details"] = i18n.__("ProductionOrder.details.isRequired:%s is required", i18n.__("ProductionOrder.details._:Details")); //"Harus ada minimal 1 detail";
                }
                else if(valid.details.length>0) {
                    var detailErrors = [];
                    for (var detail of valid.details) {
                        var detailError = {};
                        detail.code=generateCode();
                        if (!detail.colorRequest || detail.colorRequest=="")
                            detailError["colorRequest"] = i18n.__("ProductionOrder.details.colorRequest.isRequired:%s is required", i18n.__("PurchaseRequest.details.colorRequest._:ColorRequest")); //"colorRequest tidak boleh kosong";
                        if (detail.quantity <= 0)
                            detailError["quantity"] = i18n.__("ProductionOrder.details.quantity.isRequired:%s is required", i18n.__("PurchaseRequest.details.quantity._:Quantity")); //Jumlah barang tidak boleh kosong";
                        if(!_uom)
                            detailError["uom"] = i18n.__("ProductionOrder.details.uom.isRequired:%s is not exists", i18n.__("ProductionOrder.details.uom._:Uom")); //"satuan tidak boleh kosong";
                        if(_uom){
                            detail.uomId=new ObjectId(_uom._id);
                        }
                        if (!detail.colorTemplate || detail.colorTemplate=="")
                            detailError["colorTemplate"] = i18n.__("ProductionOrder.details.colorTemplate.isRequired:%s is required", i18n.__("PurchaseRequest.details.colorTemplate._:ColorTemplate")); //"colorTemplate tidak boleh kosong";
                        
                        if (!_colors)
                            detailError["colorType"] = i18n.__("ProductionOrder.details.colorType.isRequired:%s is required", i18n.__("PurchaseRequest.details.colorType._:ColorType")); //"colorType tidak boleh kosong";
                        
                        if (Object.getOwnPropertyNames(detailError).length > 0)
                            detailErrors.push(detailError);
                    }
                    if (detailErrors.length > 0)
                        errors.details = detailErrors;
                    
                   
                }
                if(!valid.orderNo || valid.orderNo===''){
                    valid.orderNo = generateCode();
                }
                if(_buyer){
                    valid.buyerId=new ObjectId(_buyer._id);
                }
                if(_lampStandard){
                    valid.lampStandardId=new ObjectId(_lampStandard._id);
                }
                if(_uom){
                    valid.uomId=new ObjectId(_uom._id);
                }
                if(_process){
                    valid.processTypeId=new ObjectId(_process._id);
                }
                if(_order){
                    valid.orderTypeId=new ObjectId(_order._id);
                }
                if(_material){
                    valid.material=_material;
                    valid.materialId=new ObjectId(_material._id);
                }
                for (var detail of valid.details) {
                    for (var _color of _colors) {
                        if (detail.colorTypeId.toString() === _color._id.toString()) {
                            detail.colorTypeId = _color._id;
                            detail.colorType = _color;
                            break;
                        }
                    }
                }

                valid.deliveryDate=new Date(valid.deliveryDate);

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (!valid.stamp){
                    valid = new ProductionOrder(valid);
                }

                valid.stamp(this.user.username, "manager");
                
                return Promise.resolve(valid);
            });
     }

     _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.finishingPrinting.collection.SalesContract}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.production.finishingPrinting.collection.SalesContract}_no`,
            key: {
                salesContractNo: 1
            }
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    create(productionOrder) {
         return new Promise((resolve, reject) => {
            this._validate(productionOrder)
                .then(validproductionOrder => {
                    var prodOrd=[];
                    prodOrd.push(validproductionOrder);
                   this.collection.singleOrDefault({
                        "$and": [{
                        salesContractNo: validproductionOrder.salesContractNo},
                        {_deleted:false}]
                    }).then(result=>{
                        if(result!=null){
                            for(var prodOrders of result.productionOrders){
                                prodOrd.push(prodOrders);
                            }
                            result.productionOrders=prodOrd;
                            if (!result.stamp){
                                result = new SalesContract(result);
                            }
                            var dailyOperation = [];
                            for(var a of validproductionOrder.details){
                                var newDailyOperation = new DailyOperation();
                                newDailyOperation.salesContract = validproductionOrder.salesContractNo;
                                newDailyOperation.productionOrder = validproductionOrder;
                                newDailyOperation.materialId = new ObjectId(validproductionOrder.materialId);
                                newDailyOperation.material = validproductionOrder.material;
                                newDailyOperation.construction = validproductionOrder.construction;
                                newDailyOperation.color = a.colorRequest;
                                newDailyOperation.colorTypeId = new ObjectId(a.colorTypeId);
                                newDailyOperation.colorType = a.colorType;
                                newDailyOperation.stamp(this.user.username, "manager");
                                dailyOperation.push(newDailyOperation);
                            }

                            result.stamp(this.user.username, "manager");
                            this.collection.update(result)
                                .then(id => {
                                    DailyOperationCollection.insertMany(dailyOperation)
                                    .then(dOperation => {
                                        resolve(id);
                                    })
                                    .catch(e => {
                                        reject(e);
                                    });
                                })
                                .catch(e => {
                                    reject(e);
                                })
                        }
                        else{
                            var SalesContractData={
                                salesContractNo: validproductionOrder.salesContractNo,
                                date:new Date(),
                                productionOrders:prodOrd
                            };
                            if (!SalesContractData.stamp){
                                SalesContractData = new SalesContract(SalesContractData);
                            }
                            var dailyOperation = [];
                            for(var a of validproductionOrder.details){
                                var newDailyOperation = new DailyOperation();
                                newDailyOperation.salesContract = validproductionOrder.salesContractNo;
                                newDailyOperation.productionOrder = validproductionOrder;
                                newDailyOperation.materialId = new ObjectId(validproductionOrder.materialId);
                                newDailyOperation.material = validproductionOrder.material;
                                newDailyOperation.construction = validproductionOrder.construction;
                                newDailyOperation.color = a.colorRequest;
                                newDailyOperation.colorTypeId = new ObjectId(a.colorTypeId);
                                newDailyOperation.colorType = a.colorType;
                                newDailyOperation.stamp(this.user.username, "manager");
                                dailyOperation.push(newDailyOperation);
                            }

                            SalesContractData.stamp(this.user.username, "manager");
                            this.collection.insert(SalesContractData)
                                .then(id => {
                                    DailyOperationCollection.insertMany(dailyOperation)
                                    .then(dOperation => {
                                        resolve(id);
                                    })
                                    .catch(e => {
                                        reject(e);
                                    });
                                })
                                .catch(e => {
                                    reject(e);
                                });

                        }
                    }).catch(e => {
                        reject(e);
                    })
                           
                })
                .catch(e => {
                    reject(e);
                })
        });
    }


   update(data){
       return new Promise((resolve, reject) => {
            this._validate(data)
            .then(validproductionOrder => {
                this.collection.singleOrDefault({
                    "$and": [{
                        salesContractNo: validproductionOrder.salesContractNo},
                        {_deleted:false}]
                }).then(result=>{
                    var newProdOrder=[];
                    var prodOrd=result.productionOrders;
                    for(var i of prodOrd){
                        if(i.orderNo==validproductionOrder.orderNo){
                            i=validproductionOrder;
                            var query={
                                "productionOrder.orderNo":data.orderNo
                            }
                            DailyOperationCollection.deleteMany(query);
                            var dailyOperation = [];
                            for(var a of i.details){
                                var newDailyOperation = new DailyOperation();
                                newDailyOperation.salesContract = i.salesContractNo;
                                newDailyOperation.productionOrder = i;
                                newDailyOperation.materialId = new ObjectId(i.materialId);
                                newDailyOperation.material = i.material;
                                newDailyOperation.construction = i.construction;
                                newDailyOperation.color = a.colorRequest;
                                newDailyOperation.colorTypeId = new ObjectId(a.colorTypeId);
                                newDailyOperation.colorType = a.colorType;
                                newDailyOperation.stamp(this.user.username, "manager");
                                dailyOperation.push(newDailyOperation);
                            }
                        }
                        newProdOrder.push(i);
                    }
                    result.productionOrders=newProdOrder;
                    if (!result.stamp){
                        result = new SalesContract(result);
                    }
                    result.stamp(this.user.username, "manager");
                    this.collection.update(result)
                    .then(id => {
                        DailyOperationCollection.insertMany(dailyOperation)
                        .then(dOperation => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        });
                    })
                    .catch(e => {
                        reject(e);
                    })
                    
                }).catch(e => {
                        reject(e);
                    })
            }).catch(e => {
                reject(e);
            })
       })
       
   }


   delete(data){
       return new Promise((resolve, reject) => {
                     this.collection.singleOrDefault({
                        "$and": [{
                        salesContractNo: data.salesContractNo},
                        {_deleted:false}]
                    }).then(id=>{
                        if(id.productionOrders.length==1){
                            id._deleted=true;
                            this.collection.update(id)
                                .then(id => {
                                     DailyOperationCollection.updateMany(
                                        {
                                            "productionOrder.orderNo":data.orderNo
                                        },
                                        { $set: { "_deleted" : true } }
                                    )
                                    .then(dOperation => {
                                        resolve(id);
                                    })
                                    .catch(e => {
                                        reject(e);
                                    });
                                })
                                .catch(e => {
                                    reject(e);
                                })
                        }
                        else{
                            for(var i of id.productionOrders){
                                if(i.orderNo==data.orderNo){
                                    for(var j=0; j<id.productionOrders.length;j++){
                                        id.productionOrders.splice(j,1);
                                    }
                                }
                            }
                            this.collection.update(id)
                                .then(id => {
                                    DailyOperationCollection.updateMany(
                                        {
                                            "productionOrder.orderNo":data.orderNo
                                        },
                                        { $set: { "_deleted" : true } }
                                    )
                                    .then(dOperation => {
                                        resolve(id);
                                    })
                                    .catch(e => {
                                        reject(e);
                                    });
                                })
                                .catch(e => {
                                    reject(e);
                                })
                        }
                        
                    }).catch(e => {
                        reject(e);
                    });
                }).catch(e => {
                    reject(e);
                });
       
   }

   pdf(id,no) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(salesContract => {
                    var productionOrder={};
                    for(var i of salesContract.productionOrders){
                        if(i.orderNo==no){
                            productionOrder=i;
                        }
                    }
                    var getDefinition = require("../../../pdf/definitions/production-order");
                    var definition = getDefinition(productionOrder);

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