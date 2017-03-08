'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var ProductionOrder=DLModels.sales.ProductionOrder;
var ProductionOrderDetail=DLModels.sales.ProductionOrderDetail;
var ProductionOrderLampStandard=DLModels.sales.ProductionOrderLampStandard;
var DailyOperation=DLModels.production.finishingPrinting.DailyOperation;
var LampStandardManager=require('../master/lamp-standard-manager');
var BuyerManager=require('../master/buyer-manager');
var UomManager = require('../master/uom-manager');
var ProductManager = require('../master/product-manager');
var ProcessTypeManager = require('../master/process-type-manager');
var OrderTypeManager = require('../master/order-type-manager');
var ColorTypeManager = require('../master/color-type-manager');
var FinishTypeManager = require('../master/finish-type-manager');
var StandardTestManager = require('../master/standard-test-manager');
var MaterialConstructionManager = require ('../master/material-construction-manager');
var YarnMaterialManager = require ('../master/yarn-material-manager');
var AccountManager = require ('../auth/account-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var generateCode = require("../../utils/code-generator");
var DailyOperationCollection=null;
var assert = require('assert');

module.exports = class ProductionOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        
        this.collection = this.db.collection(map.sales.collection.ProductionOrder);
        DailyOperationCollection=this.db.collection(map.production.finishingPrinting.collection.DailyOperation);
        this.LampStandardManager = new LampStandardManager(db, user);
        this.BuyerManager= new BuyerManager(db,user);
        this.UomManager = new UomManager(db, user);
        this.ProductManager = new ProductManager(db, user);
        this.ProcessTypeManager = new ProcessTypeManager(db, user);
        this.ColorTypeManager = new ColorTypeManager(db, user);
        this.OrderTypeManager = new OrderTypeManager(db, user);
        this.MaterialConstructionManager= new MaterialConstructionManager(db, user);
        this.YarnMaterialManager = new YarnMaterialManager(db,user);
        this.FinishTypeManager= new FinishTypeManager(db, user);
        this.StandardTestManager= new StandardTestManager(db, user);
        this.AccountManager=new AccountManager(db, user);
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
           
           var filterOrderNo = {
               'orderNo': {
                    '$regex': regex
                }
            };

            var filterBuyerName = {
               'buyer.name': {
                    '$regex': regex
                }
            };

            var filterBuyerType = {
               'buyer.type': {
                    '$regex': regex
                }
            };

            var filterProcessType = {
               'processType.name': {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterSalesContract, filterOrderNo,filterBuyerName,filterBuyerType,filterProcessType]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    _beforeInsert(productionOrder) {
        productionOrder.orderNo = productionOrder.orderNo === "" ? generateCode() : productionOrder.orderNo;
        productionOrder._createdDate = new Date();
        return Promise.resolve(productionOrder);
    }

     _validate(productionOrder) {
        var errors = {};

        var valid=productionOrder;
        var getProductionOrder = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            orderNo: valid.orderNo
        });

        var getBuyer = ObjectId.isValid(valid.buyerId) ? this.BuyerManager.getSingleByIdOrDefault(valid.buyerId) : Promise.resolve(null);
        var getUom = valid.uom && ObjectId.isValid(valid.uomId) ? this.UomManager.getSingleByIdOrDefault(valid.uomId) : Promise.resolve(null);
        var getProduct = ObjectId.isValid(valid.materialId) ? this.ProductManager.getSingleByIdOrDefault(valid.materialId) : Promise.resolve(null);
        var getProcessType = ObjectId.isValid(valid.processTypeId) ? this.ProcessTypeManager.getSingleByIdOrDefault(valid.processTypeId) : Promise.resolve(null);
        var getOrderType = ObjectId.isValid(valid.orderTypeId) ? this.OrderTypeManager.getSingleByIdOrDefault(valid.orderTypeId) : Promise.resolve(null);
        var getFinishType = ObjectId.isValid(valid.finishTypeId) ? this.FinishTypeManager.getSingleByIdOrDefault(valid.finishTypeId) : Promise.resolve(null);
        var getYarnMaterial= ObjectId.isValid(valid.yarnMaterialId) ? this.YarnMaterialManager.getSingleByIdOrDefault(valid.yarnMaterialId) : Promise.resolve(null);
        var getStandardTest= ObjectId.isValid(valid.standardTestId) ? this.StandardTestManager.getSingleByIdOrDefault(valid.standardTestId) : Promise.resolve(null);
        var getMaterialConstruction = ObjectId.isValid(valid.materialConstructionId) ? this.MaterialConstructionManager.getSingleByIdOrDefault(valid.materialConstructionId) : Promise.resolve(null);
        var getAccount= ObjectId.isValid(valid.accountId) ? this.AccountManager.getSingleByIdOrDefault(valid.accountId) : Promise.resolve(null);

        valid.details = valid.details || [];
        var getColorTypes = [];
        for (var detail of valid.details) {
            if (ObjectId.isValid(detail.colorTypeId)) {
                var color=ObjectId.isValid(detail.colorTypeId) ? this.ColorTypeManager.getSingleByIdOrDefault(detail.colorTypeId) : Promise.resolve(null);
                getColorTypes.push(color);
            }
        }

        valid.lampStandards= valid.lampStandards || [];
        var getLampStandards=[];
        for (var lamp of valid.lampStandards) {
            if (ObjectId.isValid(lamp.lampStandardId)) {
                var lamps=ObjectId.isValid(lamp.lampStandardId) ? this.LampStandardManager.getSingleByIdOrDefault(lamp.lampStandardId) : Promise.resolve(null);
                getLampStandards.push(lamps);
            }
        }

        return Promise.all([getProductionOrder, getBuyer, getUom,  getProduct, getProcessType, getOrderType, getFinishType, getYarnMaterial, getStandardTest, getMaterialConstruction, getAccount].concat(getColorTypes,getLampStandards))
            .then(results => {
                var _productionOrder =results[0];
                var _buyer = results[1];
                var _uom = results[2];
                var _material = results[3];
                var _process = results[4];
                var _order = results[5];
                var _finish= results[6];
                var _yarn = results[7];
                var _standard = results[8];
                var _construction = results[9];
                var _account = results[10];
                var _colors = results.slice(11, 11+ getColorTypes.length);
                var _lampStandards= results.slice(11+ getColorTypes.length, results.length);

                if(_productionOrder){
                    errors["orderNo"] = i18n.__("ProductionOrder.orderNo.isExist:%s is Exist", i18n.__("Product.orderNo._:orderNo")); //"orderNo sudah ada";
                }
                if (valid.uom) {
                    if (!valid.uom.unit || valid.uom.unit == '')
                        errors["uom"] = i18n.__("ProductionOrder.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";
                }
                else
                    errors["uom"] = i18n.__("ProductionOrder.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";

                if(!valid.salesContractNo || valid.salesContractNo===''){
                    errors["salesContractNo"]=i18n.__("ProductionOrder.salesContractNo.isRequired:%s is required", i18n.__("ProductionOrder.salesContractNo._:SalesContractNo")); //"salesContractNo tidak boleh kosong";
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
                
                if (!_yarn)
                    errors["yarnMaterial"] = i18n.__("ProductionOrder.yarnMaterial.isRequired:%s is not exists", i18n.__("ProductionOrder.yarnMaterial._:YarnMaterial")); //"yarnMaterial tidak boleh kosong";
                else if (!valid.yarnMaterialId)
                    errors["yarnMaterial"] = i18n.__("ProductionOrder.yarnMaterial.isRequired:%s is required", i18n.__("ProductionOrder.yarnMaterial._:YarnMaterial")); //"yarnMaterial tidak boleh kosong";
                
                if (!_construction)
                    errors["materialConstruction"] = i18n.__("ProductionOrder.materialConstruction.isRequired:%s is not exists", i18n.__("ProductionOrder.materialConstruction._:MaterialConstruction")); //"materialConstruction tidak boleh kosong";
                else if (!valid.materialConstructionId)
                    errors["materialConstructionId"] = i18n.__("ProductionOrder.materialConstruction.isRequired:%s is required", i18n.__("ProductionOrder.materialConstruction._:MaterialConstruction")); //"materialConstruction tidak boleh kosong";
                
                if (!_finish)
                    errors["finishType"] = i18n.__("ProductionOrder.finishType.isRequired:%s is not exists", i18n.__("ProductionOrder.finishType._:FinishType")); //"finishType tidak boleh kosong";
                else if (!valid.finishTypeId)
                    errors["finishType"] = i18n.__("ProductionOrder.finishType.isRequired:%s is required", i18n.__("ProductionOrder.finishType._:FinishType")); //"finishType tidak boleh kosong";
                
                if (!_standard)
                    errors["standardTest"] = i18n.__("ProductionOrder.standardTest.isRequired:%s is not exists", i18n.__("ProductionOrder.standardTest._:StandardTest")); //"standardTest tidak boleh kosong";
                else if (!valid.standardTestId)
                    errors["standardTest"] = i18n.__("ProductionOrder.standardTest.isRequired:%s is required", i18n.__("ProductionOrder.standardTest._:StandardTest")); //"standardTest tidak boleh kosong";
                
                if(!_account){
                    errors["account"] = i18n.__("ProductionOrder.account.isRequired:%s is not exists", i18n.__("ProductionOrder.account._:Account")); //"account tidak boleh kosong";
                }
                else if (!valid.accountId)
                    errors["account"] = i18n.__("ProductionOrder.account.isRequired:%s is required", i18n.__("ProductionOrder.account._:Account")); //"account tidak boleh kosong";
                
                if(!valid.packingInstruction || valid.packingInstruction===''){
                    errors["packingInstruction"]=i18n.__("ProductionOrder.packingInstruction.isRequired:%s is required", i18n.__("ProductionOrder.packingInstruction._:PackingInstruction")); //"PackingInstruction tidak boleh kosong";
                }

                if(!valid.materialOrigin || valid.materialOrigin===''){
                    errors["materialOrigin"]=i18n.__("ProductionOrder.materialOrigin.isRequired:%s is required", i18n.__("ProductionOrder.materialOrigin._:MaterialOrigin")); //"materialOrigin tidak boleh kosong";
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
                     errors["deliveryDate"] = i18n.__("ProductionOrder.deliveryDate.isRequired:%s is required", i18n.__("ProductionOrder.deliveryDate._:deliveryDate")); //"deliveryDate tidak boleh kosong";
                }
                // else{
                //     valid.deliveryDate=new Date(valid.deliveryDate);
                //     var today=new Date();
                //     today.setHours(0,0,0,0);
                //     if(today>valid.deliveryDate){
                //         errors["deliveryDate"] = i18n.__("ProductionOrder.deliveryDate.shouldNot:%s should not be less than today's date", i18n.__("ProductionOrder.deliveryDate._:deliveryDate")); //"deliveryDate tidak boleh kurang dari tanggal hari ini";
                //     }
                // }

                if(_order){
                    if(_order.name.trim().toLowerCase()=="printing"){
                        if(!valid.RUN || valid.RUN==""){
                            errors["RUN"]=i18n.__("ProductionOrder.RUN.isRequired:%s is required", i18n.__("ProductionOrder.RUN._:RUN")); //"RUN tidak boleh kosong";
                        }
                        if(valid.RUN && valid.RUN!="Tanpa RUN"){
                            if(!valid.RUNWidth || valid.RUNWidth.length<=0){
                                errors["RUNWidth"]=i18n.__("ProductionOrder.RUNWidth.isRequired:%s is required", i18n.__("ProductionOrder.RUNWidth._:RUNWidth")); //"RUNWidth tidak boleh kosong";
                            }
                            if(valid.RUNWidth.length>0){
                                for(var r=0; r<valid.RUNWidth.length; r++){
                                    if(valid.RUNWidth[r]<=0){
                                        errors["RUNWidth"]=i18n.__("ProductionOrder.RUNWidth.shouldNot:%s should not be less than or equal zero", i18n.__("ProductionOrder.RUNWidth._:RUNWidth")); //"RUNWidth tidak boleh nol";
                                        break;
                                    }
                                }
                            }
                        }
                        if(!valid.designNumber || valid.designNumber==""){
                            errors["designNumber"]=i18n.__("ProductionOrder.designNumber.isRequired:%s is required", i18n.__("ProductionOrder.designNumber._:DesignNumber")); //"designNumber tidak boleh kosong";
                        }
                        if(!valid.designCode || valid.designCode==""){
                            errors["designCode"]=i18n.__("ProductionOrder.designCode.isRequired:%s is required", i18n.__("ProductionOrder.designCode._:DesignCode")); //"designCode tidak boleh kosong";
                        }
                    }
                }

                if (!_buyer)
                    errors["buyer"] = i18n.__("ProductionOrder.buyer.isRequired:%s is not exists", i18n.__("ProductionOrder.buyer._:Buyer")); //"Buyer tidak boleh kosong";
                else if (!valid.buyerId)
                    errors["buyer"] = i18n.__("ProductionOrder.buyer.isRequired:%s is required", i18n.__("ProductionOrder.buyer._:Buyer")); //"Buyer tidak boleh kosong";
                
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
                
                if (!valid.shippingQuantityTolerance || valid.shippingQuantityTolerance === 0)
                    errors["shippingQuantityTolerance"] = i18n.__("ProductionOrder.shippingQuantityTolerance.isRequired:%s is required", i18n.__("ProductionOrder.shippingQuantityTolerance._:ShippingQuantityTolerance")); //"shippingQuantityTolerance tidak boleh kosong";
                else if(valid.shippingQuantityTolerance>100){
                    errors["shippingQuantityTolerance"] =i18n.__("ProductionOrder.shippingQuantityTolerance.shouldNot:%s should not more than 100", i18n.__("ProductionOrder.shippingQuantityTolerance._:ShippingQuantityTolerance")); //"shippingQuantityTolerance tidak boleh lebih dari 100";
                }

                if (!valid.materialWidth || valid.materialWidth === "")
                    errors["materialWidth"] = i18n.__("ProductionOrder.materialWidth.isRequired:%s is required", i18n.__("ProductionOrder.materialWidth._:MaterialWidth")); //"materialWidth tidak boleh kosong";
                
                valid.lampStandards=valid.lampStandards || [];
                if(valid.lampStandards && valid.lampStandards.length<=0){
                    errors["lampStandards"]= i18n.__("ProductionOrder.lampStandards.isRequired:%s is required", i18n.__("ProductionOrder.lampStandards._:LampStandards")); //"Harus ada minimal 1 lampStandard";
                }
                else if(valid.lampStandards.length>0) {
                    var lampErrors = [];
                    for (var lamp of valid.lampStandards) {
                        var lampError = {};
                        if(!_lampStandards || _lampStandards.length<=0 ){
                            lampError["lampStandards"] = i18n.__("ProductionOrder.lampStandards.lampStandard.isRequired:%s is not exists", i18n.__("ProductionOrder.lampStandards.lampStandard._:LampStandard")); //"lampStandard tidak boleh kosong";
                        
                        }
                        if(!lamp.lampStandard._id){
                            lampError["lampStandards"] = i18n.__("ProductionOrder.lampStandards.lampStandard.isRequired:%s is not exists", i18n.__("ProductionOrder.lampStandards.lampStandard._:LampStandard")); //"lampStandard tidak boleh kosong";
                        
                        }
                    if (Object.getOwnPropertyNames(lampError).length > 0)
                            lampErrors.push(lampError);
                    }
                    if (lampErrors.length > 0)
                        errors.lampStandards = lampErrors;
                }

                valid.details = valid.details || [];
                if (valid.details && valid.details.length <= 0) {
                    errors["details"] = i18n.__("ProductionOrder.details.isRequired:%s is required", i18n.__("ProductionOrder.details._:Details")); //"Harus ada minimal 1 detail";
                }
                else if(valid.details.length>0) {
                    var detailErrors = [];
                    var totalqty=0;
                    for(var i of valid.details){
                        totalqty+=i.quantity;
                    }
                    for (var detail of valid.details) {
                        var detailError = {};
                        detail.code=generateCode();
                        if (!detail.colorRequest || detail.colorRequest=="")
                            detailError["colorRequest"] = i18n.__("ProductionOrder.details.colorRequest.isRequired:%s is required", i18n.__("ProductionOrder.details.colorRequest._:ColorRequest")); //"colorRequest tidak boleh kosong";
                        if (detail.quantity <= 0)
                            detailError["quantity"] = i18n.__("ProductionOrder.details.quantity.isRequired:%s is required", i18n.__("ProductionOrder.details.quantity._:Quantity")); //Jumlah barang tidak boleh kosong";
                        if(valid.orderQuantity!=totalqty)
                            detailError["total"] = i18n.__("ProductionOrder.details.quantity.shouldNot:%s Total should equal Order Quantity", i18n.__("ProductionOrder.details.quantity._:Quantity")); //Jumlah barang tidak boleh berbeda dari jumlah order";
                    
                        if(!_uom)
                            detailError["uom"] = i18n.__("ProductionOrder.details.uom.isRequired:%s is not exists", i18n.__("ProductionOrder.details.uom._:Uom")); //"satuan tidak boleh kosong";
                        
                        if(_uom){
                            detail.uomId=new ObjectId(_uom._id);
                        }
                        if (!detail.colorTemplate || detail.colorTemplate=="")
                            detailError["colorTemplate"] = i18n.__("ProductionOrder.details.colorTemplate.isRequired:%s is required", i18n.__("ProductionOrder.details.colorTemplate._:ColorTemplate")); //"colorTemplate tidak boleh kosong";
                        
                        }
                        if(_order){
                            if(_order.name.toLowerCase()=="yarn dyed" || _order.name.toLowerCase()=="printing" ){
                                _colors={};
                            }
                            else{
                                if (!_colors)
                                    detailError["colorType"] = i18n.__("ProductionOrder.details.colorType.isRequired:%s is required", i18n.__("ProductionOrder.details.colorType._:ColorType")); //"colorType tidak boleh kosong";
                                else if(!detail.colorType){
                                    detailError["colorType"] = i18n.__("ProductionOrder.details.colorType.isRequired:%s is required", i18n.__("ProductionOrder.details.colorType._:ColorType")); //"colorType tidak boleh kosong";
                        
                            }
                            
                        }
                        
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
                if(_uom){
                    valid.uomId=new ObjectId(_uom._id);
                }
                if(_process){
                    valid.processTypeId=new ObjectId(_process._id);
                }

                if(_account){
                    valid.accountId=new ObjectId(_account._id);
                }
                
                if(valid.lampStandards.length>0){
                    for(var lamp of valid.lampStandards){
                        for (var _lampStandard of _lampStandards) {
                            if(_lampStandard){
                                if (lamp.lampStandardId.toString() === _lampStandard._id.toString()) {
                                    lamp.lampStandardId = _lampStandard._id;
                                    lamp.lampStandard = _lampStandard;
                                }
                            }
                        }
                    }
                }
                
                if(_order){
                    valid.orderTypeId=new ObjectId(_order._id);
                    if(_order.name.toLowerCase()!="printing"){
                        valid.RUN="";
                        valid.RUNWidth=[];
                        valid.designCode="";
                        valid.designNumber="";
                        valid.articleFabricEdge="";
                    }
                    if(_order.name.toLowerCase()=="yarn dyed" || _order.name.toLowerCase()=="printing" ){
                        for (var detail of valid.details) {
                            detail.colorTypeId = null;
                            detail.colorType = null;
                        }
                    }
                    else{
                        for (var detail of valid.details) {
                            if(detail.colorType){
                                for (var _color of _colors) {
                                    if(_color){
                                        if (detail.colorTypeId.toString() === _color._id.toString()) {
                                            detail.colorTypeId = _color._id;
                                            detail.colorType = _color;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if(_material){
                    valid.material=_material;
                    valid.materialId=new ObjectId(_material._id);
                }
                
                if(_finish){
                    valid.finishType=_finish;
                    valid.finishTypeId=new ObjectId(_finish._id);
                }

                if(_yarn){
                    valid.yarnMaterial=_yarn;
                    valid.yarnMaterialId=new ObjectId(_yarn._id);
                }

                if(_standard){
                    valid.standardTest=_standard;
                    valid.standardTestId=_standard._id;
                }

                if(_construction){
                    valid.materialConstruction=_construction;
                    valid.materialConstructionId=_construction._id;
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
            name: `ix_${map.sales.collection.ProductionOrder}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.sales.collection.ProductionOrder}_orderNo`,
            key: {
                orderNo: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }
    
   pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(productionOrder => {
                    
                    var getDefinition = require("../../pdf/definitions/production-order");
                    var definition = getDefinition(productionOrder);

                    var generatePdf = require("../../pdf/pdf-generator");
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

    getSingleProductionOrderDetail(detailCode){
        return new Promise((resolve, reject) => {
            var query = {"details": { "$elemMatch": { "code": detailCode}}};
            this.collection.singleOrDefault(query).then((result) => {
                var dataReturn = {};
                if (result){
                    for (var detail of result.details){
                        if (detailCode === detail.code)
                            dataReturn = new ProductionOrderDetail(detail);
                    }
                }
                resolve(dataReturn);
            });
        });
    }
    
    getReport(query){
        return new Promise((resolve, reject) => {
            var deletedQuery = {
                _deleted: false
            };
            var salesQuery = {};
            if(query.salesContractNo != ''){
                salesQuery = {
                    "salesContractNo" : {
                        "$regex" : (new RegExp(query.salesContractNo, "i"))
                    } 
                };
            }
            var orderQuery = {};
            if(query.orderNo != ''){
                orderQuery = {
                    "orderNo" : {
                        "$regex" : (new RegExp(query.orderNo, "i"))
                    }
                };
            }
            var orderTypeQuery = {};
            if(query.orderTypeId){
                orderTypeQuery = {
                    "orderTypeId" : (new ObjectId(query.orderTypeId))
                };
            }
            var processTypeQuery = {};
            if(query.processTypeId){
                processTypeQuery ={
                    "processTypeId" : (new ObjectId(query.processTypeId))
                };
            }
            var buyerQuery = {};
            if(query.buyerId){
                buyerQuery = {
                    "buyerId" : (new ObjectId(query.buyerId))
                };
            }
            var accountQuery = {};
            if(query.accountId){
                accountQuery = {
                    "accountId" : (new ObjectId(query.accountId))
                };
            }
            var date = {
                "_createdDate" : {
                    "$gte" : (!query || !query.sdate ? (new Date("1900-01-01")) : (new Date(`${query.sdate} 00:00:00`))),
                    "$lte" : (!query || !query.edate ? (new Date()) : (new Date(`${query.edate} 23:59:59`)))
                }
            };
            var Query = {"$and" : [date, salesQuery,orderQuery,orderTypeQuery, processTypeQuery, buyerQuery, accountQuery,deletedQuery]};
            this.collection
                .aggregate([ 
                    {$unwind: "$details"}, 
                    {$match : Query},
                    {$project :{
                        "salesContractNo" : 1,
                        "_createdDate" : 1,
                        "orderNo" : 1,
                        "orderType" : "$orderType.name",
                        "processType" : "$processType.name",
                        "buyer" : "$buyer.name",
                        "buyerType" : "$buyer.type",
                        "orderQuantity" : "$orderQuantity",
                        "uom" : "$uom.unit",
                        "colorTemplate" : "$details.colorTemplate",
                        "colorRequest" : "$details.colorRequest",
                        "colorType" : "$details.colorType.name",
                        "quantity" : "$details.quantity",
                        "uomDetail" : "$details.uom.unit",
                        "deliveryDate" : "$deliveryDate",
                        "firstname" : "$account.profile.firstname",
                        "lastname" : "$account.profile.lastname"
                    }},
                    {$sort : {"_createdDate" : -1}}
                ])
                .toArray(function(err, result) {
                    resolve(result);
                })
        });
    }
}