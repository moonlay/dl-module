'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var WeavingSalesContract = DLModels.sales.WeavingSalesContract;
var BuyerManager = require('../master/buyer-manager');
var UomManager = require('../master/uom-manager');
var ProductManager = require('../master/product-manager');
var TermOfPaymentManager = require('../master/term-of-payment-manager');
var MaterialConstructionManager = require('../master/material-construction-manager');
var YarnMaterialManager = require('../master/yarn-material-manager');
var AccountBankManager = require('../master/account-bank-manager');
var ComodityManager = require('../master/comodity-manager');
var QualityManager = require('../master/quality-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var generateCode = require("../../utils/code-generator");
var assert = require('assert');

module.exports = class WeavingSalesContractManager extends BaseManager {
    constructor(db, user) {
        super(db, user);

        this.collection = this.db.collection(map.sales.collection.WeavingSalesContract);
        this.buyerManager = new BuyerManager(db, user);
        this.UomManager = new UomManager(db, user);
        this.ProductManager = new ProductManager(db, user);
        this.TermOfPaymentManager = new TermOfPaymentManager(db, user);
        this.YarnMaterialManager = new YarnMaterialManager(db, user);
        this.MaterialConstructionManager = new MaterialConstructionManager(db, user);
        this.ComodityManager = new ComodityManager(db, user);
        this.QualityManager = new QualityManager(db, user);
        this.AccountBankManager = new AccountBankManager(db, user);
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
                '$or': [filterSalesContract, filterBuyerName, filterBuyerType, filterType]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    _beforeInsert(salesContract) {
        salesContract.salesContractNo = salesContract.salesContractNo === "" ? generateCode() : salesContract.salesContractNo;
        salesContract._createdDate = new Date();
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

        //get Object from ...
        var getBuyer = valid.buyer && ObjectId.isValid(valid.buyer._id) ? this.buyerManager.getSingleByIdOrDefault(valid.buyer._id) : Promise.resolve(null);
        var getUom = valid.uom && ObjectId.isValid(valid.uom._id) ? this.UomManager.getSingleByIdOrDefault(valid.uom._id) : Promise.resolve(null);
        var getProduct = valid.material && ObjectId.isValid(valid.material._id) ? this.ProductManager.getSingleByIdOrDefault(valid.material._id) : Promise.resolve(null);
        var getYarnMaterial = valid.yarnMaterial && ObjectId.isValid(valid.yarnMaterial._id) ? this.YarnMaterialManager.getSingleByIdOrDefault(valid.yarnMaterial._id) : Promise.resolve(null);
        var getMaterialConstruction = valid.materialConstruction && ObjectId.isValid(valid.materialConstruction._id) ? this.MaterialConstructionManager.getSingleByIdOrDefault(valid.materialConstruction._id) : Promise.resolve(null);
        var getComodity = valid.comodity && ObjectId.isValid(valid.comodity._id) ? this.ComodityManager.getSingleByIdOrDefault(valid.comodity._id) : Promise.resolve(null);
        var getQuality = valid.quality && ObjectId.isValid(valid.quality._id) ? this.QualityManager.getSingleByIdOrDefault(valid.quality._id) : Promise.resolve(null);
        var getBankAccount = valid.accountBank && ObjectId.isValid(valid.accountBank._id) ? this.AccountBankManager.getSingleByIdOrDefault(valid.accountBank._id) : Promise.resolve(null);
        var getTermOfPayment = valid.termOfPayment && ObjectId.isValid(valid.termOfPayment._id) ? this.TermOfPaymentManager.getSingleByIdOrDefault(valid.termOfPayment._id) : Promise.resolve(null);


        return Promise.all([getSalesContractPromise, getBuyer, getUom, getProduct, getYarnMaterial, getMaterialConstruction, getComodity, getQuality, getBankAccount, getTermOfPayment])
            .then(results => {
                var _salesContract = results[0];
                var _buyer = results[1];
                var _uom = results[2];
                var _material = results[3];
                var _yarn = results[4];
                var _construction = results[5];
                var _comodity = results[6];
                var _quality = results[7];
                var _bank = results[8];
                var _payment = results[9];

                if (valid.uom) {
                    if (!valid.uom.unit || valid.uom.unit == '')
                        errors["uom"] = i18n.__("WeavingSalesContract.uom.isRequired:%s is required", i18n.__("WeavingSalesContract.uom._:Uom")); //"Satuan tidak boleh kosong";
                }
                else
                    errors["uom"] = i18n.__("WeavingSalesContract.uom.isRequired:%s is required", i18n.__("WeavingSalesContract.uom._:Uom")); //"Satuan tidak boleh kosong";

                if (_salesContract) {
                    errors["salesContractNo"] = i18n.__("WeavingSalesContract.salesContractNo.isExist:%s is Exist", i18n.__("WeavingSalesContract.salesContractNo._:SalesContractNo")); //"no Sales Contract tidak boleh kosong";
                }

                if (!_construction) {
                    errors["materialConstruction"] = i18n.__("WeavingSalesContract.materialConstruction.isRequired:%s is not exsist", i18n.__("WeavingSalesContract.materialConstruction._:MaterialConstruction")); //"materialConstruction tidak boleh kosong";
                }


                if (!_payment) {
                    errors["termOfPayment"] = i18n.__("FinishingPrintingSalesContract.termOfPayment.isRequired:%s is not exsist", i18n.__("FinishingPrintingSalesContract.termOfPayment._:TermOfPayment")); //"termOfPayment tidak boleh kosong";
                }


                if (!_yarn) {
                    errors["yarnMaterial"] = i18n.__("WeavingSalesContract.yarnMaterial.isRequired:%s is not exsist", i18n.__("WeavingSalesContract.yarnMaterial._:YarnMaterial")); //"yarnMaterial tidak boleh kosong";
                }

                if (!_quality) {
                    errors["quality"] = i18n.__("WeavingSalesContract.quality.isRequired:%s is not exsist", i18n.__("WeavingSalesContract.quality._:Quality")); //"quality tidak boleh kosong";
                }

                if (!_material)
                    errors["material"] = i18n.__("WeavingSalesContract.material.isRequired:%s is not exists", i18n.__("WeavingSalesContract.material._:Material")); //"material tidak boleh kosong";

                if (!valid.materialWidth || valid.materialWidth === '') {
                    errors["materialWidth"] = i18n.__("WeavingSalesContract.materialWidth.isRequired:%s is required", i18n.__("WeavingSalesContract.materialWidth._:MaterialWidth")); //"lebar material tidak boleh kosong";
                }

                if (!_comodity)
                    errors["comodity"] = i18n.__("WeavingSalesContract.comodity.isRequired:%s is not exists", i18n.__("WeavingSalesContract.comodity._:Comodity")); //"comodity tidak boleh kosong";

                if (!valid.condition || valid.condition === '') {
                    errors["condition"] = i18n.__("WeavingSalesContract.condition.isRequired:%s is required", i18n.__("WeavingSalesContract.condition._:Condition")); //"condition tidak boleh kosong";
                }

                if (!valid.packing || valid.packing === '') {
                    errors["packing"] = i18n.__("WeavingSalesContract.packing.isRequired:%s is required", i18n.__("WeavingSalesContract.packing._:Packing")); //"packing tidak boleh kosong";
                }

                if (!_buyer)
                    errors["buyer"] = i18n.__("WeavingSalesContract.buyer.isRequired:%s is not exists", i18n.__("WeavingSalesContract.buyer._:Buyer")); //"Buyer tidak boleh kosong";

                if (!_bank)
                    errors["accountBank"] = i18n.__("WeavingSalesContract.accountBank.isRequired:%s is not exists", i18n.__("WeavingSalesContract.accountBank._:accountBank")); //"accountBank tidak boleh kosong";

                if (!valid.shippingQuantityTolerance || valid.shippingQuantityTolerance === 0)
                    errors["shippingQuantityTolerance"] = i18n.__("WeavingSalesContract.shippingQuantityTolerance.isRequired:%s is required", i18n.__("WeavingSalesContract.shippingQuantityTolerance._:ShippingQuantityTolerance")); //"shippingQuantityTolerance tidak boleh kosong";
                if (valid.shippingQuantityTolerance > 100) {
                    errors["shippingQuantityTolerance"] = i18n.__("WeavingSalesContract.shippingQuantityTolerance.shouldNot:%s should not more than 100", i18n.__("WeavingSalesContract.shippingQuantityTolerance._:ShippingQuantityTolerance")); //"shippingQuantityTolerance tidak boleh lebih dari 100";
                }

                if (!valid.price || valid.price === 0)
                    errors["price"] = i18n.__("WeavingSalesContract.price.isRequired:%s is required", i18n.__("WeavingSalesContract.price._:Price")); //"price tidak boleh kosong";

                if (!valid.deliveredTo || valid.deliveredTo === '') {
                    errors["deliveredTo"] = i18n.__("WeavingSalesContract.deliveredTo.isRequired:%s is required", i18n.__("WeavingSalesContract.deliveredTo._:DeliveredTo")); //"deliveredTo tidak boleh kosong";
                }

                if (!valid.deliverySchedule || valid.deliverySchedule === "") {
                    errors["deliverySchedule"] = i18n.__("WeavingSalesContract.deliverySchedule.isRequired:%s is required", i18n.__("WeavingSalesContract.deliverySchedule._:deliverySchedule")); //"deliverySchedule tidak boleh kosong";
                }
                if (!valid.incomeTax || valid.incomeTax === '') {
                    errors["incomeTax"] = i18n.__("WeavingSalesContract.incomeTax.isRequired:%s is required", i18n.__("WeavingSalesContract.incomeTax._:IncomeTax")); //"incomeTax tidak boleh kosong";
                }
                else {
                    valid.deliverySchedule = new Date(valid.deliverySchedule);
                    var today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (today > valid.deliverySchedule) {
                        errors["deliverySchedule"] = i18n.__("WeavingSalesContract.deliverySchedule.shouldNot:%s should not be less than today's date", i18n.__("WeavingSalesContract.deliverySchedule._:deliverySchedule")); //"deliverySchedule tidak boleh kurang dari tanggal hari ini";
                    }
                }



                if (_buyer) {
                    valid.buyerId = new ObjectId(_buyer._id);
                    valid.buyer = _buyer;
                    if (valid.buyer.type.trim().toLowerCase() == "ekspor") {
                        if (!valid.termOfShipment || valid.termOfShipment == "") {
                            errors["termOfShipment"] = i18n.__("WeavingSalesContract.termOfShipment.isRequired:%s is required", i18n.__("WeavingSalesContract.termOfShipment._:termOfShipment")); //"termOfShipment tidak boleh kosong";
                        }
                    }
                }
                if (_quality) {
                    valid.qualityId = new ObjectId(_quality._id);
                    valid.quality = _quality;
                }
                if (_uom) {
                    valid.uomId = new ObjectId(_uom._id);
                    valid.uom = _uom;
                }

                if (_material) {
                    valid.material = _material;
                    valid.materialId = new ObjectId(_material._id);
                }
                if (_comodity) {
                    valid.comodityId = new ObjectId(_comodity._id);
                    valid.comodity = _comodity;
                }
                if (_yarn) {
                    valid.yarnMaterialId = new ObjectId(_yarn._id);
                    valid.yarnMaterial = _yarn;
                }
                if (_bank) {
                    valid.accountBankId = new ObjectId(_bank._id);
                    valid.accountBank = _bank;
                }
                if (_construction) {
                    valid.materialConstructionId = new ObjectId(_construction._id);
                    valid.materialConstruction = _construction;
                }
                valid.deliverySchedule = new Date(valid.deliverySchedule);

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (!valid.stamp) {
                    valid = new WeavingSalesContract(valid);
                }

                valid.stamp(this.user.username, "manager");

                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.sales.collection.WeavingSalesContract}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.sales.collection.WeavingSalesContract}_salesContractNo`,
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

                    var getDefinition = require("../../pdf/definitions/weaving-sales-contract");
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