'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var SpinningSalesContract=DLModels.sales.SpinningSalesContract;
var BuyerManager=require('../master/buyer-manager');
var UomManager = require('../master/uom-manager');
var AccountBankManager = require ('../master/account-bank-manager');
var ComodityManager = require ('../master/comodity-manager');
var QualityManager = require ('../master/quality-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var generateCode = require("../../utils/code-generator");
var assert = require('assert');

module.exports = class SpinningSalesContractManager extends BaseManager {
    constructor(db, user) {
        super(db, user);

        this.collection = this.db.collection(map.sales.collection.SpinningSalesContract);
        this.BuyerManager= new BuyerManager(db,user);
        this.UomManager = new UomManager(db, user);
        this.ComodityManager=new ComodityManager(db,user);
        this.QualityManager=new QualityManager(db,user);
        this.AccountBankManager=new AccountBankManager(db,user);
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
                '$or': [filterSalesContract, filterBuyerName, filterBuyerType,filterType]
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
        var getComodity= ObjectId.isValid(valid.comodityId) ? this.ComodityManager.getSingleByIdOrDefault(valid.comodityId) : Promise.resolve(null);
        var getQuality= ObjectId.isValid(valid.qualityId) ? this.QualityManager.getSingleByIdOrDefault(valid.qualityId) : Promise.resolve(null);
        var getBankAccount= ObjectId.isValid(valid.accountBankId) ? this.AccountBankManager.getSingleByIdOrDefault(valid.accountBankId) : Promise.resolve(null);

        

        return Promise.all([getSalesContractPromise, getBuyer, getUom, getComodity, getQuality, getBankAccount])
            .then(results => {
                var _salesContract = results[0];
                var _buyer = results[1];
                var _uom = results[2];
                var _comodity=results[3];
                var _quality=results[4];
                var _bank=results[5];

                if (valid.uom) {
                    if (!valid.uom.unit || valid.uom.unit == '')
                        errors["uom"] = i18n.__("SpinningSalesContract.uom.isRequired:%s is required", i18n.__("SpinningSalesContract.uom._:Uom")); //"Satuan tidak boleh kosong";
                }
                else
                    errors["uom"] = i18n.__("SpinningSalesContract.uom.isRequired:%s is required", i18n.__("SpinningSalesContract.uom._:Uom")); //"Satuan tidak boleh kosong";

                if(_salesContract){
                    errors["salesContractNo"]=i18n.__("SpinningSalesContract.salesContractNo.isExist:%s is Exist", i18n.__("SpinningSalesContract.salesContractNo._:SalesContractNo")); //"no Sales Contract tidak boleh kosong";
                }

                
                if(!valid.paymentMethod || valid.paymentMethod===''){
                    errors["paymentMethod"]=i18n.__("SpinningSalesContract.paymentMethod.isRequired:%s is required", i18n.__("SpinningSalesContract.paymentMethod._:PaymentMethod")); //"paymentMethod tidak boleh kosong";
                }

                if(!valid.paymentRequirement || valid.paymentRequirement===''){
                    errors["paymentRequirement"]=i18n.__("SpinningSalesContract.paymentRequirement.isRequired:%s is required", i18n.__("SpinningSalesContract.paymentRequirement._:PaymentRequirement")); //"paymentRequirement tidak boleh kosong";
                }

                if(!_quality){
                    errors["quality"]=i18n.__("SpinningSalesContract.quality.isRequired:%s is not exsist", i18n.__("SpinningSalesContract.quality._:Quality")); //"quality tidak boleh kosong";
                }
                else if(!valid.qualityId){
                    errors["quality"]=i18n.__("SpinningSalesContract.quality.isRequired:%s is required", i18n.__("SpinningSalesContract.quality._:Quality")); //"quality tidak boleh kosong";
                }

                if (!_comodity)
                    errors["comodity"] = i18n.__("SpinningSalesContract.comodity.isRequired:%s is not exists", i18n.__("SpinningSalesContract.comodity._:Comodity")); //"comodity tidak boleh kosong";
                else if (!valid.comodityId)
                    errors["comodity"] = i18n.__("SpinningSalesContract.comodity.isRequired:%s is required", i18n.__("SpinningSalesContract.comodity._:Comodity")); //"comodity tidak boleh kosong";

                if(!valid.rollLength || valid.rollLength===''){
                    errors["rollLength"]=i18n.__("SpinningSalesContract.rollLength.isRequired:%s is required", i18n.__("SpinningSalesContract.rollLength._:RollLength")); //"rollLength tidak boleh kosong";
                }

                if(!valid.condition || valid.condition===''){
                    errors["condition"]=i18n.__("SpinningSalesContract.condition.isRequired:%s is required", i18n.__("SpinningSalesContract.condition._:Condition")); //"condition tidak boleh kosong";
                }

                if(!valid.packing || valid.packing===''){
                    errors["packing"]=i18n.__("SpinningSalesContract.packing.isRequired:%s is required", i18n.__("SpinningSalesContract.packing._:Packing")); //"packing tidak boleh kosong";
                }

                if(!valid.incomeTax || valid.incomeTax===''){
                    errors["incomeTax"]=i18n.__("SpinningSalesContract.incomeTax.isRequired:%s is required", i18n.__("SpinningSalesContract.incomeTax._:IncomeTax")); //"incomeTax tidak boleh kosong";
                }

                if (!_buyer)
                    errors["buyer"] = i18n.__("SpinningSalesContract.buyer.isRequired:%s is not exists", i18n.__("SpinningSalesContract.buyer._:Buyer")); //"Buyer tidak boleh kosong";
                else if (!valid.buyerId)
                    errors["buyer"] = i18n.__("SpinningSalesContract.buyer.isRequired:%s is required", i18n.__("SpinningSalesContract.buyer._:Buyer")); //"Buyer tidak boleh kosong";
                
                if (!_bank)
                    errors["accountBank"] = i18n.__("SpinningSalesContract.accountBank.isRequired:%s is not exists", i18n.__("SpinningSalesContract.accountBank._:Buyer")); //"accountBank tidak boleh kosong";
                else if (!valid.accountBankId)
                    errors["accountBank"] = i18n.__("SpinningSalesContract.accountBank.isRequired:%s is required", i18n.__("SpinningSalesContract.accountBank._:Buyer")); //"accountBank tidak boleh kosong";
                
                if (!valid.shippingQuantityTolerance || valid.shippingQuantityTolerance === 0)
                    errors["shippingQuantityTolerance"] = i18n.__("SpinningSalesContract.shippingQuantityTolerance.isRequired:%s is required", i18n.__("SpinningSalesContract.shippingQuantityTolerance._:ShippingQuantityTolerance")); //"shippingQuantityTolerance tidak boleh kosong";
                else if(valid.shippingQuantityTolerance>100){
                    errors["shippingQuantityTolerance"] =i18n.__("SpinningSalesContract.shippingQuantityTolerance.shouldNot:%s should not more than 100", i18n.__("SpinningSalesContract.shippingQuantityTolerance._:ShippingQuantityTolerance")); //"shippingQuantityTolerance tidak boleh lebih dari 100";
                }

                if(!valid.deliveredTo || valid.deliveredTo===''){
                    errors["deliveredTo"]=i18n.__("SpinningSalesContract.deliveredTo.isRequired:%s is required", i18n.__("SpinningSalesContract.deliveredTo._:DeliveredTo")); //"deliveredTo tidak boleh kosong";
                }
                if (!valid.deliverySchedule || valid.deliverySchedule === "") {
                     errors["deliverySchedule"] = i18n.__("SpinningSalesContract.deliverySchedule.isRequired:%s is required", i18n.__("SpinningSalesContract.deliverySchedule._:DeliverySchedule")); //"deliverySchedule tidak boleh kosong";
                }
                else{
                    valid.deliverySchedule=new Date(valid.deliverySchedule);
                    var today=new Date();
                    today.setHours(0,0,0,0);
                    if(today>valid.deliverySchedule){
                        errors["deliverySchedule"] = i18n.__("SpinningSalesContract.deliverySchedule.shouldNot:%s should not be less than today's date", i18n.__("SpinningSalesContract.deliverySchedule._:deliverySchedule")); //"deliverySchedule tidak boleh kurang dari tanggal hari ini";
                    }
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
                
                if(_comodity){
                    valid.comodityId=new ObjectId(_comodity._id);
                    valid.comodity=_comodity;
                }
                
                if(_bank){
                    valid.accountBankId=new ObjectId(_bank._id);
                    valid.accountBank=_bank;
                }
                valid.deliverySchedule=new Date(valid.deliverySchedule);

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (!valid.stamp){
                    valid = new SpinningSalesContract(valid);
                }

                valid.stamp(this.user.username, "manager");
                
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.sales.collection.SpinningSalesContract}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.sales.collection.SpinningSalesContract}_salesContractNo`,
            key: {
                salesContractNo: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }
    
//    pdf(id) {
//         return new Promise((resolve, reject) => {

//             this.getSingleById(id)
//                 .then(productionOrder => {
                    
//                     var getDefinition = require("../../pdf/definitions/production-order");
//                     var definition = getDefinition(productionOrder);

//                     var generatePdf = require("../../pdf/pdf-generator");
//                     generatePdf(definition)
//                         .then(binary => {
//                             resolve(binary);
//                         })
//                         .catch(e => {
//                             reject(e);
//                         });
//                 })
//                 .catch(e => {
//                     reject(e);
//                 });
//         });
//     }
}