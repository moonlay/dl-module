'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var SpinningSalesContract = DLModels.sales.SpinningSalesContract;
var BuyerManager = require('../master/buyer-manager');
var UomManager = require('../master/uom-manager');
var TermOfPaymentManager = require('../master/term-of-payment-manager');
var AccountBankManager = require('../master/account-bank-manager');
var ComodityManager = require('../master/comodity-manager');
var QualityManager = require('../master/quality-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var generateCode = require("../../utils/code-generator");
var assert = require('assert');
var moment = require("moment");

const NUMBER_DESCRIPTION = "SC Spinning"

module.exports = class SpinningSalesContractManager extends BaseManager {
    constructor(db, user) {
        super(db, user);

        this.collection = this.db.collection(map.sales.collection.SpinningSalesContract);
        this.buyerManager = new BuyerManager(db, user);
        this.UomManager = new UomManager(db, user);
        this.TermOfPaymentManager = new TermOfPaymentManager(db, user);
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

        var type = salesContract && salesContract.buyer && salesContract.buyer.type && (salesContract.buyer.type.toString().toLowerCase() === "ekspor" || salesContract.buyer.type.toString().toLowerCase() === "export") ? "SPE" : "SPL";

        var query = { "type": type, "description": NUMBER_DESCRIPTION };
        var fields = { "number": 1, "year": 1 };

        return this.documentNumbers
            .findOne(query, fields)
            .then((previousDocumentNumber) => {

                var yearNow = parseInt(moment().format("YYYY"));
                var monthNow = moment().format("MM");

                var number = 1;

                if (!salesContract.saleContractNo) {
                    if (previousDocumentNumber) {

                        var oldYear = previousDocumentNumber.year;
                        number = yearNow > oldYear ? number : previousDocumentNumber.number + 1;

                        salesContract.salesContractNo = `${this.pad(number, 4)}/${type}/${monthNow}.${yearNow}`;
                    } else {
                        salesContract.saleContractNo = `0001/${type}/${monthNow}.${yearNow}`;
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
        var getUom = this.UomManager.collection.find({ unit: "BALL" }).toArray();
        var getComodity = valid.comodity && ObjectId.isValid(valid.comodity._id) ? this.ComodityManager.getSingleByIdOrDefault(valid.comodity._id) : Promise.resolve(null);
        var getQuality = valid.quality && ObjectId.isValid(valid.quality._id) ? this.QualityManager.getSingleByIdOrDefault(valid.quality._id) : Promise.resolve(null);
        var getBankAccount = valid.accountBank && ObjectId.isValid(valid.accountBank._id) ? this.AccountBankManager.getSingleByIdOrDefault(valid.accountBank._id) : Promise.resolve(null);
        var getTermOfPayment = valid.termOfPayment && ObjectId.isValid(valid.termOfPayment._id) ? this.TermOfPaymentManager.getSingleByIdOrDefault(valid.termOfPayment._id) : Promise.resolve(null);
        var getAgent = valid.agent && ObjectId.isValid(valid.agent._id) ? this.buyerManager.getSingleByIdOrDefault(valid.agent._id) : Promise.resolve(null);

        return Promise.all([getSalesContractPromise, getBuyer, getUom, getComodity, getQuality, getBankAccount, getTermOfPayment, getAgent])
            .then(results => {
                var _salesContract = results[0];
                var _buyer = results[1];
                var uom = results[2];
                var _uom = uom[0];
                var _comodity = results[3];
                var _quality = results[4];
                var _bank = results[5];
                var _payment = results[6];
                var _agent = results[7];
                var deliverySchedule = moment(valid.deliverySchedule).format("YYYY-MM-DD");

                if (_salesContract) {
                    errors["salesContractNo"] = i18n.__("SpinningSalesContract.salesContractNo.isExist:%s is Exist", i18n.__("SpinningSalesContract.salesContractNo._:SalesContractNo")); //"no Sales Contract tidak boleh kosong";
                }

                if (!_payment) {
                    errors["termOfPayment"] = i18n.__("FinishingPrintingSalesContract.termOfPayment.isRequired:%s is not exsist", i18n.__("FinishingPrintingSalesContract.termOfPayment._:TermOfPayment")); //"termOfPayment tidak boleh kosong";
                }

                if (!_quality) {
                    errors["quality"] = i18n.__("SpinningSalesContract.quality.isRequired:%s is not exsist", i18n.__("SpinningSalesContract.quality._:Quality")); //"quality tidak boleh kosong";

                }


                if (!_comodity)
                    errors["comodity"] = i18n.__("SpinningSalesContract.comodity.isRequired:%s is not exists", i18n.__("SpinningSalesContract.comodity._:Comodity")); //"comodity tidak boleh kosong";

                if (!valid.incomeTax || valid.incomeTax === '') {
                    errors["incomeTax"] = i18n.__("SpinningSalesContract.incomeTax.isRequired:%s is required", i18n.__("SpinningSalesContract.incomeTax._:IncomeTax")); //"incomeTax tidak boleh kosong";
                }

                if (!_buyer)
                    errors["buyer"] = i18n.__("SpinningSalesContract.buyer.isRequired:%s is not exists", i18n.__("SpinningSalesContract.buyer._:Buyer")); //"Buyer tidak boleh kosong";

                if (!_bank)
                    errors["accountBank"] = i18n.__("SpinningSalesContract.accountBank.isRequired:%s is not exists", i18n.__("SpinningSalesContract.accountBank._:accountBank")); //"accountBank tidak boleh kosong";

                if (valid.shippingQuantityTolerance > 100 || valid.shippingQuantityTolerance < 0) {
                    errors["shippingQuantityTolerance"] = i18n.__("SpinningSalesContract.shippingQuantityTolerance.shouldNot:%s should not more than 100", i18n.__("SpinningSalesContract.shippingQuantityTolerance._:ShippingQuantityTolerance")); //"shippingQuantityTolerance tidak boleh lebih dari 100";
                }

                if (!valid.price || valid.price === 0)
                    errors["price"] = i18n.__("SpinningSalesContract.price.isRequired:%s is required", i18n.__("SpinningSalesContract.price._:Price")); //"price tidak boleh kosong";

                if (!valid.deliveredTo || valid.deliveredTo === '') {
                    errors["deliveredTo"] = i18n.__("SpinningSalesContract.deliveredTo.isRequired:%s is required", i18n.__("SpinningSalesContract.deliveredTo._:DeliveredTo")); //"deliveredTo tidak boleh kosong";
                }

                if (!valid.deliverySchedule || valid.deliverySchedule === "") {
                    errors["deliverySchedule"] = i18n.__("SpinningSalesContract.deliverySchedule.isRequired:%s is required", i18n.__("SpinningSalesContract.deliverySchedule._:DeliverySchedule")); //"deliverySchedule tidak boleh kosong";
                }
                // else {
                //     valid.deliverySchedule = new Date(valid.deliverySchedule);
                //     var today = new Date();
                //     today.setHours(0, 0, 0, 0);
                //     if (today > valid.deliverySchedule) {
                //         errors["deliverySchedule"] = i18n.__("SpinningSalesContract.deliverySchedule.shouldNot:%s should not be less than today's date", i18n.__("SpinningSalesContract.deliverySchedule._:deliverySchedule")); //"deliverySchedule tidak boleh kurang dari tanggal hari ini";
                //     }
                // }


                if (_buyer) {
                    valid.buyerId = new ObjectId(_buyer._id);
                    valid.buyer = _buyer;
                    if (valid.buyer.type.trim().toLowerCase() == "ekspor" || valid.buyer.type.trim().toLowerCase() == "export") {
                        if (!valid.termOfShipment || valid.termOfShipment == "") {
                            errors["termOfShipment"] = i18n.__("SpinningSalesContract.termOfShipment.isRequired:%s is required", i18n.__("SpinningSalesContract.termOfShipment._:termOfShipment")); //"termOfShipment tidak boleh kosong";
                        }
                        if (_agent) {
                            if (!valid.comission || valid.comission == "") {
                                errors["comission"] = i18n.__("FinishingPrintingSalesContract.comission.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.comission._:Comission")); //"comission tidak boleh kosong";
                            }
                        }
                    }
                }

                if (!valid.orderQuantity || valid.orderQuantity <= 0) {
                    errors["orderQuantity"] = i18n.__("FinishingPrintingSalesContract.orderQuantity.isRequired:%s is required", i18n.__("FinishingPrintingSalesContract.orderQuantity._:OrderQuantity")); //"orderQuantity tidak boleh kosong";
                }

                if (_quality) {
                    valid.qualityId = new ObjectId(_quality._id);
                    valid.quality = _quality;
                }

                if (_uom) {
                    valid.uomId = new ObjectId(_uom._id);
                    valid.uom = _uom;
                }

                if (_comodity) {
                    valid.comodityId = new ObjectId(_comodity._id);
                    valid.comodity = _comodity;
                }

                if (_bank) {
                    valid.accountBankId = new ObjectId(_bank._id);
                    valid.accountBank = _bank;
                }

                valid.deliverySchedule = new Date(deliverySchedule);

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (!valid.stamp) {
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

    pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(salesContract => {

                    var getDefinition = require("../../pdf/definitions/spinning-sales-contract");
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

    getSpinningSalesContractReport(info) {
        var _defaultFilter = {
            _deleted: false
        }, buyerFilter = {}, comodityFilter = {},
            spinningSalesContractFilter = {},
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

        for (var spinningSalesContract of result.data) {
            index++;

            var agent = spinningSalesContract.agent.code + "-" + spinningSalesContract.agent.name;

            var item = {};
            item["No"] = index;
            item["Nomor Sales Contract"] = spinningSalesContract ? spinningSalesContract.salesContractNo : '';
            item["Tanggal Sales Contract"] = spinningSalesContract._createdDate ? moment(new Date(spinningSalesContract._createdDate)).format(dateFormat) : '';
            item["Buyer"] = spinningSalesContract.buyer ? spinningSalesContract.buyer.name : '';
            item["Jenis Buyer"] = spinningSalesContract.buyer ? spinningSalesContract.buyer.type : '';
            item["Nomor Disposisi"] = spinningSalesContract ? spinningSalesContract.dispositionNumber : '';
            item["Komoditas"] = spinningSalesContract.comodity ? spinningSalesContract.comodity.name : '';
            item["Jumlah Order"] = spinningSalesContract ? spinningSalesContract.orderQuantity : '';
            item["Satuan"] = spinningSalesContract.uom ? spinningSalesContract.uom.unit : '';
            item["Toleransi (%)"] = spinningSalesContract ? spinningSalesContract.shippingQuantityTolerance : '';
            item["Kualitas"] = spinningSalesContract.quality ? spinningSalesContract.quality.name : '';
            item["Harga"] = spinningSalesContract ? spinningSalesContract.price : '';
            item["Satuan"] = spinningSalesContract.uom ? spinningSalesContract.uom.unit : '';
            item["Mata Uang"] = spinningSalesContract.accountBank.currency ? spinningSalesContract.accountBank.currency.code : '';
            item["Syarat Pembayaran"] = spinningSalesContract.termOfPayment ? spinningSalesContract.termOfPayment.termOfPayment : '';
            item["Pembayaran ke Rekening"] = spinningSalesContract.accountBank ? spinningSalesContract.accountBank.accountName + "-" + spinningSalesContract.accountBank.bankName + "-" + spinningSalesContract.accountBank.accountNumber + "-" + spinningSalesContract.accountBank.currency.code : '';
            item["Jadwal Pengiriman"] = spinningSalesContract ? moment(new Date(spinningSalesContract.deliverySchedule)).format(dateFormat) : '';
            item["Agen"] = spinningSalesContract.agent && spinningSalesContract.agent.name ? spinningSalesContract.agent.name : '';
            item["Komisi"] = spinningSalesContract ? spinningSalesContract.comission : '';

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
        xls.options["Toleransi"] = "number";
        xls.options["Kualitas"] = "string";
        xls.options["Harga"] = "number";
        xls.options["Mata Uang"] = "string";
        xls.options["Syarat Pembayaran"] = "string";
        xls.options["Pembayaran ke Rekening"] = "string";
        xls.options["Jadwal Pengiriman"] = "string";
        xls.options["Agen"] = "string";
        xls.options["Komisi"] = "string";


        if (query.dateFrom && query.dateTo) {
            xls.name = `Sales Contract - Spinning  Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Sales Contract - Spinning Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Sales Contract - Spinning Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Sales Contract - Spinning Report.xlsx`;

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