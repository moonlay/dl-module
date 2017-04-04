'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var FinishingPrintingSalesContract=DLModels.sales.FinishingPrintingSalesContract;
var FinishingPrintingSalesContractDetail=DLModels.sales.FinishingPrintingSalesContractDetail;
var BuyerManager=require('../master/buyer-manager');
var UomManager = require('../master/uom-manager');
var ProductManager = require('../master/product-manager');
var DesignMotiveManager = require('../master/design-motive-manager');
var OrderTypeManager = require('../master/order-type-manager');
var MaterialConstructionManager = require ('../master/material-construction-manager');
var YarnMaterialManager = require ('../master/yarn-material-manager');
var AccountBankManager = require ('../master/account-bank-manager');
var ComodityManager = require ('../master/comodity-manager');
var QualityManager = require ('../master/quality-manager');
var TermOfPaymentManager = require ('../master/term-of-payment-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var generateCode = require("../../utils/code-generator");
var assert = require('assert');

module.exports = class FinishingPrintingSalesContractManager extends BaseManager {
    constructor(db, user) {
        super(db, user);

        this.collection = this.db.collection(map.sales.collection.FinishingPrintingSalesContract);
        this.BuyerManager= new BuyerManager(db,user);
        this.UomManager = new UomManager(db, user);
        this.ProductManager = new ProductManager(db, user);
        this.DesignMotiveManager = new DesignMotiveManager(db, user);
        this.OrderTypeManager = new OrderTypeManager(db, user);
        this.YarnMaterialManager= new YarnMaterialManager(db,user);
        this.MaterialConstructionManager=new MaterialConstructionManager(db,user);
        this.ComodityManager=new ComodityManager(db,user);
        this.QualityManager=new QualityManager(db,user);
        this.AccountBankManager=new AccountBankManager(db,user);
        this.TermOfPaymentManager=new TermOfPaymentManager(db,user);
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

            keywordFilter = {
                '$or': [filterSalesContract, filterBuyerName, filterBuyerType]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    _beforeInsert(salesContract) {
        salesContract.salesContractNo = salesContract.salesContractNo === "" ? generateCode() : salesContract.salesContractNo;
        salesContract._createdDate=new Date();
        return Promise.resolve(salesContract);
    }

    _validate(salesContract) {
        var errors = {};
        var valid = salesContract;

        var getSalesContractPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            salesContractNo: valid.salesContractNo
        });

        var getBuyer = ObjectId.isValid(valid.buyerId) ? this.BuyerManager.getSingleByIdOrDefault(valid.buyerId) : Promise.resolve(null);
        var getUom = valid.uom && ObjectId.isValid(valid.uomId) ? this.UomManager.getSingleByIdOrDefault(valid.uomId) : Promise.resolve(null);
        var getProduct = ObjectId.isValid(valid.materialId) ? this.ProductManager.getSingleByIdOrDefault(valid.materialId) : Promise.resolve(null);
        var getMotive = ObjectId.isValid(valid.designMotiveId) ? this.DesignMotiveManager.getSingleByIdOrDefault(valid.designMotiveId) : Promise.resolve(null);
        var getOrderType = ObjectId.isValid(valid.orderTypeId) ? this.OrderTypeManager.getSingleByIdOrDefault(valid.orderTypeId) : Promise.resolve(null);
        var getYarnMaterial= ObjectId.isValid(valid.yarnMaterialId) ? this.YarnMaterialManager.getSingleByIdOrDefault(valid.yarnMaterialId) : Promise.resolve(null);
        var getMaterialConstruction = ObjectId.isValid(valid.materialConstructionId) ? this.MaterialConstructionManager.getSingleByIdOrDefault(valid.materialConstructionId) : Promise.resolve(null);
        var getComodity= ObjectId.isValid(valid.comodityId) ? this.ComodityManager.getSingleByIdOrDefault(valid.comodityId) : Promise.resolve(null);
        var getQuality= ObjectId.isValid(valid.qualityId) ? this.QualityManager.getSingleByIdOrDefault(valid.qualityId) : Promise.resolve(null);
        var getBankAccount= ObjectId.isValid(valid.accountBankId) ? this.AccountBankManager.getSingleByIdOrDefault(valid.accountBankId) : Promise.resolve(null);
        var getAgent = ObjectId.isValid(valid.agentId) ? this.BuyerManager.getSingleByIdOrDefault(valid.agentId) : Promise.resolve(null);
        var getTermOfPayment=ObjectId.isValid(valid.termOfPaymentId) ? this.TermOfPaymentManager.getSingleByIdOrDefault(valid.termOfPaymentId) : Promise.resolve(null);
        

        return Promise.all([getSalesContractPromise, getBuyer, getUom,  getProduct, getMotive, getOrderType, getYarnMaterial, getMaterialConstruction, getComodity, getQuality, getBankAccount,getAgent,getTermOfPayment])
            .then(results => {
                var _salesContract = results[0];
                var _buyer = results[1];
                var _uom = results[2];
                var _material = results[3];
                var _motive = results[4];
                var _order = results[5];
                var _yarn= results[6];
                var _construction= results[7];
                var _comodity=results[8];
                var _quality=results[9];
                var _bank=results[10];
                var _agent=results[11];
                var _payment=results[12];

                if (valid.uom) {
                    if (!valid.uom.unit || valid.uom.unit == '')
                        errors["uom"] = i18n.__("FinishingPrintingSalesContract.uom.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.uom._:Uom")); //"Satuan tidak boleh kosong";
                }
                else
                    errors["uom"] = i18n.__("FinishingPrintingSalesContract.uom.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.uom._:Uom")); //"Satuan tidak boleh kosong";

                if(_salesContract){
                    errors["salesContractNo"]=i18n.__("FinishingPrintingSalesContract.salesContractNo.isExist:%s is Exist", i18n.__("FinishingPrintingSalesContract.salesContractNo._:SalesContractNo")); //"no Sales Contract tidak boleh kosong";
                }

                if(!_construction){
                    errors["materialConstruction"]=i18n.__("FinishingPrintingSalesContract.materialConstruction.isRequired:%s is not exsist", i18n.__("FinishingPrintingSalesContract.materialConstruction._:MaterialConstruction")); //"materialConstruction tidak boleh kosong";
                }
                
                if(!_payment){
                    errors["termOfPayment"]=i18n.__("FinishingPrintingSalesContract.termOfPayment.isRequired:%s is not exsist", i18n.__("FinishingPrintingSalesContract.termOfPayment._:TermOfPayment")); //"termOfPayment tidak boleh kosong";
                }

                if(!_yarn){
                    errors["yarnMaterial"]=i18n.__("FinishingPrintingSalesContract.yarnMaterial.isRequired:%s is not exsist", i18n.__("FinishingPrintingSalesContract.yarnMaterial._:YarnMaterial")); //"yarnMaterial tidak boleh kosong";
                }
                
                if(!_quality){
                    errors["quality"]=i18n.__("FinishingPrintingSalesContract.quality.isRequired:%s is not exsist", i18n.__("FinishingPrintingSalesContract.quality._:Quality")); //"quality tidak boleh kosong";
                }
                else if(!valid.qualityId){
                    errors["quality"]=i18n.__("FinishingPrintingSalesContract.quality.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.quality._:Quality")); //"quality tidak boleh kosong";
                }

                if (!_material)
                    errors["material"] = i18n.__("FinishingPrintingSalesContract.material.isRequired:%s is not exists", i18n.__("FinishingPrintingSalesContract.material._:Material")); //"material tidak boleh kosong";
                else if (!valid.materialId)
                    errors["material"] = i18n.__("FinishingPrintingSalesContract.material.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.material._:Material")); //"material tidak boleh kosong";
                
                if(!valid.materialWidth||valid.materialWidth===''){
                    errors["materialWidth"] = i18n.__("FinishingPrintingSalesContract.materialWidth.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.materialWidth._:MaterialWidth")); //"lebar material tidak boleh kosong";
                }

                

                if (!_comodity)
                    errors["comodity"] = i18n.__("FinishingPrintingSalesContract.comodity.isRequired:%s is not exists", i18n.__("FinishingPrintingSalesContract.comodity._:Comodity")); //"comodity tidak boleh kosong";
                
                if (!_order)
                    errors["orderType"] = i18n.__("FinishingPrintingSalesContract.orderType.isRequired:%s is not exists", i18n.__("FinishingPrintingSalesContract.orderType._:OrderType")); //"orderType tidak boleh kosong";
                
                if(!valid.condition || valid.condition===''){
                    errors["condition"]=i18n.__("FinishingPrintingSalesContract.condition.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.condition._:Condition")); //"condition tidak boleh kosong";
                }

                if(!valid.deliveredTo || valid.deliveredTo===''){
                    errors["deliveredTo"]=i18n.__("FinishingPrintingSalesContract.deliveredTo.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.deliveredTo._:DeliveredTo")); //"deliveredTo tidak boleh kosong";
                }

                if (!_buyer)
                    errors["buyer"] = i18n.__("FinishingPrintingSalesContract.buyer.isRequired:%s is not exists", i18n.__("FinishingPrintingSalesContract.buyer._:Buyer")); //"Buyer tidak boleh kosong";
                
                if(valid.buyer){
                    if(valid.buyer.type.toLowerCase()=="ekspor"||valid.buyer.type.toLowerCase()=="export"){
                        if(!valid.termOfShipment||valid.termOfShipment===''){
                            errors["termOfShipment"] = i18n.__("FinishingPrintingSalesContract.termOfShipment.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.termOfShipment._:TermOfShipment")); //"term Of Shipment tidak boleh kosong";
                        }
                        if (!valid.amount || valid.amount === 0)
                            errors["amount"] = i18n.__("FinishingPrintingSalesContract.amount.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.amount._:Amount")); //"amount tidak boleh kosong";
                
                        if(_agent){
                            if(!valid.comission||valid.comission==""){
                                errors["comission"] = i18n.__("FinishingPrintingSalesContract.comission.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.comission._:Comission")); //"comission tidak boleh kosong";
                
                            }
                        }
                    }
                }

                if(!valid.orderQuantity|| valid.orderQuantity<=0){
                    errors["orderQuantity"] = i18n.__("FinishingPrintingSalesContract.orderQuantity.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.orderQuantity._:OrderQuantity")); //"orderQuantity tidak boleh kosong";
                
                }
                if (!_bank)
                    errors["accountBank"] = i18n.__("FinishingPrintingSalesContract.accountBank.isRequired:%s is not exists", i18n.__("FinishingPrintingSalesContract.accountBank._:AccountBank")); //"accountBank tidak boleh kosong";
                 
                if(valid.shippingQuantityTolerance>100){
                    errors["shippingQuantityTolerance"] =i18n.__("FinishingPrintingSalesContract.shippingQuantityTolerance.shouldNot:%s should not more than 100", i18n.__("FinishingPrintingSalesContract.shippingQuantityTolerance._:ShippingQuantityTolerance")); //"shippingQuantityTolerance tidak boleh lebih dari 100";
                }

                if (!valid.deliverySchedule || valid.deliverySchedule === "") {
                     errors["deliverySchedule"] = i18n.__("FinishingPrintingSalesContract.deliverySchedule.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.deliverySchedule._:DeliverySchedule")); //"deliverySchedule tidak boleh kosong";
                }
                else{
                    valid.deliverySchedule=new Date(valid.deliverySchedule);
                    var today=new Date();
                    today.setHours(0,0,0,0);
                    if(today>valid.deliverySchedule){
                        errors["deliverySchedule"] = i18n.__("FinishingPrintingSalesContract.deliverySchedule.shouldNot:%s should not be less than today's date", i18n.__("FinishingPrintingSalesContract.deliverySchedule._:DeliverySchedule")); //"deliverySchedule tidak boleh kurang dari tanggal hari ini";
                    }
                }
                valid.details = valid.details || [];
                if (valid.details && valid.details.length <= 0) {
                    errors["details"] = i18n.__("FinishingPrintingSalesContract.details.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.details._:Details")); //"Harus ada minimal 1 detail";
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
                        if (!detail.color || detail.color=="")
                            detailError["color"] = i18n.__("FinishingPrintingSalesContract.details.color.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.details.color._:Color")); //"color tidak boleh kosong";
                        
                        if (!detail.price || detail.price<=0)
                            detailError["price"] = i18n.__("FinishingPrintingSalesContract.details.price.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.details.price._:Price")); //"price tidak boleh kosong";
                        
                        if(valid.accountBank){
                            detail.currency=valid.accountBank.currency;
                            detail.currencyId=new ObjectId(valid.accountBank.currency._id);
                        }
                        if (Object.getOwnPropertyNames(detailError).length > 0)
                            detailErrors.push(detailError);
                    }
                    if (detailErrors.length > 0)
                        errors.details = detailErrors;
                    
                }
                if(_agent){
                    valid.agentId=new ObjectId(_agent._id);
                    valid.agent=_agent;
                }
                else{
                    valid.agentId=null;
                    valid.agent=null;
                }

                if(_buyer){
                    valid.buyerId=new ObjectId(_buyer._id);
                    valid.buyer=_buyer;
                }
                if(_quality){
                    valid.qualityId=new ObjectId(_quality._id);
                    valid.quality=_quality;
                }
                if(_uom){
                    valid.uomId=new ObjectId(_uom._id);
                    valid.uom=_uom;
                }
                if(_motive){
                    valid.designMotiveId=new ObjectId(_motive._id);
                    valid.designMotive=_motive;
                }
                else{
                    valid.designMotiveId=null;
                    valid.designMotive=null;
                }
                if(_order){
                    valid.orderTypeId=new ObjectId(_order._id);
                    valid.orderType=_order;
                }
                if(_material){
                    valid.material=_material;
                    valid.materialId=new ObjectId(_material._id);
                }
                if(_comodity){
                    valid.comodityId=new ObjectId(_comodity._id);
                    valid.comodity=_comodity;
                }
                if(_yarn){
                    valid.yarnMaterialId=new ObjectId(_yarn._id);
                    valid.yarnMaterial=_yarn;
                }
                if(_bank){
                    valid.accountBankId=new ObjectId(_bank._id);
                    valid.accountBank=_bank;
                }
                if(_construction){
                    valid.materialConstructionId=new ObjectId(_construction._id);
                    valid.materialConstruction=_construction;
                }
                valid.deliverySchedule=new Date(valid.deliverySchedule);

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (!valid.stamp){
                    valid = new FinishingPrintingSalesContract(valid);
                }

                valid.stamp(this.user.username, "manager");
                
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.sales.collection.FinishingPrintingSalesContract}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.sales.collection.FinishingPrintingSalesContract}_salesContractNo`,
            key: {
                salesContractNo: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }
    
    pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(salesContract => {
                    
                    var getDefinition = require("../../pdf/definitions/finishing-printing-sales-contract");
                    var definition = getDefinition(salesContract);

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

    
}