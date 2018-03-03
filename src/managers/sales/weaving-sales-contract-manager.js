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

var moment = require('moment');

const NUMBER_DESCRIPTION = "SC Weaving";

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
        this.documentNumbers = this.db.collection("document-numbers");
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

        var type = salesContract && salesContract.buyer && salesContract.buyer.type && (salesContract.buyer.type.toString().toLowerCase() === "ekspor" || salesContract.buyer.type.toString().toLowerCase() === "export") ? "WVE" : "WVL";
        var query = { "type": type, "description": NUMBER_DESCRIPTION };
        var fields = { "number": 1, "year": 1 };

        return this.documentNumbers
            .findOne(query, fields)
            .then((previousDocumentNumber) => {

                var yearNow = parseInt(moment().format("YYYY"));
                var monthNow = moment().format("MM");

                var number = 1;

                if (!salesContract.salesContractNo) {
                    if (previousDocumentNumber) {

                        var oldYear = previousDocumentNumber.year;
                        number = yearNow > oldYear ? number : previousDocumentNumber.number + 1;

                        salesContract.salesContractNo = `${this.pad(number, 4)}/${type}/${monthNow}.${yearNow}`;
                    } else {
                        salesContract.salesContractNo = `0001/${type}/${monthNow}.${yearNow}`;
                    }
                }

                var documentNumbersData = {
                    "$set": {
                        documentNumber: salesContract.salesContractNo,
                        number: number,
                        year: yearNow
                    }
                };

                var options = {
                    "upsert": true
                };

                return this.documentNumbers
                    .updateOne(query, documentNumbersData, options)
                    .then((id) => {
                        return Promise.resolve(salesContract)
                    })
            })
    }

    // _beforeInsert(salesContract) {
    //     salesContract.salesContractNo = salesContract.salesContractNo ? salesContract.salesContractNo : generateCode();
    //     return Promise.resolve(salesContract);
    // }

    // newCodeGenerator(oldSalesContractNo, type) {
    //     var newSalesContractNo = "";

    //     var monthNow = parseInt(moment().format("MM"));
    //     var yearNow = parseInt(moment().format("YYYY"));

    //     var codeStructure = oldSalesContractNo.split("/");
    //     var number = parseInt(codeStructure[0])

    //     if (codeStructure.length === 3) {
    //         var dateStructure = codeStructure[2].split(".");
    //         var oldYear = parseInt(dateStructure[1]);

    //         if (oldYear === yearNow) {
    //             number += 1;

    //             var dateNowStructure = [this.pad(monthNow, 2), this.pad(yearNow, 4)];
    //             codeStructure[2] = dateNowStructure.join(".");

    //             codeStructure[0] = this.pad(number, 4);

    //             newSalesContractNo = codeStructure.join("/");
    //         }
    //     }

    //     if (!newSalesContractNo) {
    //         newSalesContractNo = `0001/${type}/${this.pad(monthNow, 2)}.${this.pad(yearNow, 4)}`;
    //     }

    //     return newSalesContractNo;
    // }

    pad(number, length) {

        var str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }

        return str;
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
        var getAgent = valid.agent && ObjectId.isValid(valid.agent._id) ? this.buyerManager.getSingleByIdOrDefault(valid.agent._id) : Promise.resolve(null);

        return Promise.all([getSalesContractPromise, getBuyer, getUom, getProduct, getYarnMaterial, getMaterialConstruction, getComodity, getQuality, getBankAccount, getTermOfPayment, getAgent])
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
                var _agent = results[10];

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

                // if (!valid.condition || valid.condition === '') {
                //     errors["condition"] = i18n.__("WeavingSalesContract.condition.isRequired:%s is required", i18n.__("WeavingSalesContract.condition._:Condition")); //"condition tidak boleh kosong";
                // }

                // if (!valid.packing || valid.packing === '') {
                //     errors["packing"] = i18n.__("WeavingSalesContract.packing.isRequired:%s is required", i18n.__("WeavingSalesContract.packing._:Packing")); //"packing tidak boleh kosong";
                // }

                if (!_buyer)
                    errors["buyer"] = i18n.__("WeavingSalesContract.buyer.isRequired:%s is not exists", i18n.__("WeavingSalesContract.buyer._:Buyer")); //"Buyer tidak boleh kosong";

                if (!_bank)
                    errors["accountBank"] = i18n.__("WeavingSalesContract.accountBank.isRequired:%s is not exists", i18n.__("WeavingSalesContract.accountBank._:accountBank")); //"accountBank tidak boleh kosong";

                if (valid.shippingQuantityTolerance > 100 || valid.shippingQuantityTolerance < 0) {
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
                //else {

                //     valid.deliverySchedule = new Date(valid.deliverySchedule);
                //     var today = new Date();
                //     today.setHours(0, 0, 0, 0);
                //     if (today > valid.deliverySchedule) {
                //         errors["deliverySchedule"] = i18n.__("WeavingSalesContract.deliverySchedule.shouldNot:%s should not be less than today's date", i18n.__("WeavingSalesContract.deliverySchedule._:deliverySchedule")); //"deliverySchedule tidak boleh kurang dari tanggal hari ini";
                //     }

                // }

                if (!valid.incomeTax || valid.incomeTax === '') {
                    errors["incomeTax"] = i18n.__("WeavingSalesContract.incomeTax.isRequired:%s is required", i18n.__("WeavingSalesContract.incomeTax._:IncomeTax")); //"incomeTax tidak boleh kosong";
                }


                if (!valid.orderQuantity || valid.orderQuantity === '' || valid.orderQuantity === 0) {
                    errors["orderQuantity"] = i18n.__("WeavingSalesContract.orderQuantity.isRequired:%s should greater than 0", i18n.__("WeavingSalesContract.orderQuantity._:orderQuantity")); //"orderQuantity tidak boleh kosong";
                }

                if (_agent) {
                    valid.agentId = new ObjectId(_agent._id);
                    valid.agent = _agent;
                }

                if (_buyer) {
                    valid.buyerId = new ObjectId(_buyer._id);
                    valid.buyer = _buyer;
                    if (valid.buyer.type.trim().toLowerCase() == "ekspor") {
                        if (!valid.termOfShipment || valid.termOfShipment == "") {
                            errors["termOfShipment"] = i18n.__("WeavingSalesContract.termOfShipment.isRequired:%s is required", i18n.__("WeavingSalesContract.termOfShipment._:termOfShipment")); //"termOfShipment tidak boleh kosong jika buyer type ekspor";
                        }

                        if (_agent) {
                            if (!valid.comission) {
                                errors["comission"] = i18n.__("WeavingSalesContract.comission.isRequired:%s is required", i18n.__("WeavingSalesContract.comission._:comission")); //"comission tidak boleh kosong jika agent valid";
                            }
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

    pdf(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(salesContract => {

                    var getDefinition = require("../../pdf/definitions/weaving-sales-contract");
                    var definition = getDefinition(salesContract, offset);

                    var generatePdf = require("../../pdf/pdf-generator");
                    generatePdf(definition, offset)
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

    getWeavingSalesContractReport(info) {
        var _defaultFilter = {
            _deleted: false
        }, buyerFilter = {}, comodityFilter = {},
            salesContractNoFilter = {},
            dateFromFilter = {},
            dateToFilter = {},
            query = {};

        var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
        var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59")) : (new Date());
        var now = new Date();

        if (info.buyerId && info.buyerId != '') {
            var buyerId = ObjectId.isValid(info.buyerId) ? new ObjectId(info.buyerId) : {};
            buyerFilter = { 'buyer._id': buyerId };
        }

        if (info.comodityId && info.comodityId != '') {
            var comodityId = ObjectId.isValid(info.comodityId) ? new ObjectId(info.comodityId) : {};
            comodityFilter = { 'comodity._id': comodityId };
        }

        if (info.salesContractNo && info.salesContractNo != '') {
            var salesContractNo = ObjectId.isValid(info.salesContractNo) ? new ObjectId(info.salesContractNo) : {};
            salesContractNoFilter = { '_id': salesContractNo };
        }

        var filterDate = {
            "_createdDate": {
                $gte: new Date(dateFrom),
                $lte: new Date(dateTo)
            }
        };

        query = { '$and': [_defaultFilter, buyerFilter, salesContractNoFilter, comodityFilter, filterDate] };

        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(query)
                    .execute();
            });
    }

    getXls(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";
        var timeFormat = "HH : mm";

        for (var weavingSalesContract of result.data) {
            index++;

            var item = {};
            item["No"] = index;
            item["Nomor Sales Contract"] = weavingSalesContract ? weavingSalesContract.salesContractNo : '';
            item["Tanggal Sales Contract"] = weavingSalesContract._createdDate ? moment(new Date(weavingSalesContract._createdDate)).format(dateFormat) : '';
            item["Buyer"] = weavingSalesContract.buyer ? weavingSalesContract.buyer.name : '';
            item["Jenis Buyer"] = weavingSalesContract.buyer ? weavingSalesContract.buyer.type : '';
            item["Nomor Disposisi"] = weavingSalesContract ? weavingSalesContract.dispositionNumber : '';
            item["Komoditas"] = weavingSalesContract.comodity ? weavingSalesContract.comodity.name : '';
            item["Jumlah Order"] = weavingSalesContract ? weavingSalesContract.orderQuantity : '';
            item["Satuan"] = weavingSalesContract.uom ? weavingSalesContract.uom.unit : '';
            item["Toleransi (%)"] = weavingSalesContract ? weavingSalesContract.shippingQuantityTolerance : '';
            item["Kualitas"] = weavingSalesContract.quality ? weavingSalesContract.quality.name : '';
            item["Harga"] = weavingSalesContract ? weavingSalesContract.price : '';
            item["Satuan"] = weavingSalesContract.uom ? weavingSalesContract.uom.unit : '';
            item["Mata Uang"] = weavingSalesContract.accountBank.currency ? weavingSalesContract.accountBank.currency.code : '';
            item["Syarat Pembayaran"] = weavingSalesContract.termOfPayment ? weavingSalesContract.termOfPayment.termOfPayment : '';
            item["Pembayaran ke Rekening"] = weavingSalesContract.accountBank ? weavingSalesContract.accountBank.accountName + "-" + weavingSalesContract.accountBank.bankName + "-" + weavingSalesContract.accountBank.accountNumber + "-" + weavingSalesContract.accountBank.currency.code : '';
            item["Jadwal Pengiriman"] = weavingSalesContract ? moment(new Date(weavingSalesContract.deliverySchedule)).format(dateFormat) : '';
            item["Agen"] = weavingSalesContract.agent ? weavingSalesContract.agent.name : '';
            item["Komisi"] = weavingSalesContract ? weavingSalesContract.comission : '';

            xls.data.push(item);
        }

        xls.options["No"] = "number";
        xls.options["Nomor Sales Contract"] = "string";
        xls.options["Tanggal Sales Contract"] = "string";
        xls.options["Buyer"] = "string";
        xls.options["Jenis Buyer"] = "string";
        xls.options["Nomor Disposisi"] = "number";
        xls.options["Komoditas"] = "string";
        xls.options["Jumlah Order"] = "number";
        xls.options["Satuan"] = "string";
        xls.options["Toleransi (%)"] = "number";
        xls.options["Kualitas"] = "string";
        xls.options["Harga"] = "number";
        xls.options["Mata Uang"] = "string";
        xls.options["Syarat Pembayaran"] = "string";
        xls.options["Pembayaran ke Rekening"] = "string";
        xls.options["Jadwal Pengiriman"] = "string";
        xls.options["Agen"] = "string";
        xls.options["Komisi"] = "string";


        if (query.dateFrom && query.dateTo) {
            xls.name = `Sales Contract - Weaving  Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Sales Contract - Weaving Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Sales Contract - Weaving Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Sales Contract - Weaving Report.xlsx`;

        return Promise.resolve(xls);
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

}