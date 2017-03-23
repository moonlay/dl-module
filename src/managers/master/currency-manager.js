'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Currency = DLModels.master.Currency;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class CurrencyManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Currency);
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
            var codeFilter = {
                'code': {
                    '$regex': regex
                }
            };
            var symbolFilter = {
                'symbol': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [codeFilter, symbolFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(currency) {
        var errors = {};
        var valid = currency;
        // 1. begin: Declare promises.
        var getcurrencyPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });

        // 2. begin: Validation.
        return Promise.all([getcurrencyPromise])
            .then(results => {
                var _currency = results[0];

                if (!valid.code || valid.code == '')
                    errors["code"] = i18n.__("Currency.code.isRequired:%s is required", i18n.__("Currency.code._:Code")); //"Kode mata uang Tidak Boleh Kosong";
                else if (_currency) {
                    errors["code"] = i18n.__("Currency.code.isExists:%s is already exists", i18n.__("Currency.code._:Code")); //"Kode mata uang sudah terdaftar";
                }

                if (!valid.symbol || valid.symbol == '')
                    errors["symbol"] = i18n.__("Currency.symbol.isRequired:%s is required", i18n.__("Currency.symbol._:Symbol")); //"Simbol mata uang Tidak Boleh Kosong";

                if (!valid.rate || valid.rate == 0)
                    errors["rate"] = i18n.__("Currency.rate.isRequired:%s is required", i18n.__("Currency.rate._:Rate")); //"Rate mata uang Tidak Boleh Kosong";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new Currency(currency);
                valid.rate = Number(valid.rate);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            })
    }

     getCurrency() {
        return new Promise((resolve, reject) => {
            var query = {
                _deleted: false
            };

            this.collection
                .where(query)
                .execute()
                .then(currencies => {
                    resolve(currencies);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var currency;
            this.getCurrency()
                .then(results => {
                    currency = results.data;
                    var data = [];
                    if (dataFile != "") {
                        for (var i = 1; i < dataFile.length; i++) {
                            data.push({ "code": dataFile[i][0], "symbol": dataFile[i][1], "rate": dataFile[i][2], "description": dataFile[i][3] });
                        }
                    }
                    var dataError = [], errorMessage;
                    for (var i = 0; i < data.length; i++) {
                        errorMessage = "";
                        if (data[i]["code"] === "" || data[i]["code"] === undefined) {
                            errorMessage = errorMessage + "Kode tidak boleh kosong, ";
                        }
                        if (data[i]["symbol"] === "" || data[i]["symbol"] === undefined) {
                            errorMessage = errorMessage + "Simbol tidak boleh kosong, ";
                        }

                        if (data[i]["rate"] === "" || data[i]["rate"] === undefined) {
                            errorMessage = errorMessage + "Rate tidak boleh kosong, ";
                        } else if (isNaN(data[i]["rate"])) {
                            errorMessage = errorMessage + "Rate harus numerik, ";
                        }
                        else {
                            var rateTemp = (data[i]["rate"]).toString().split(".");
                            if (rateTemp[1] === undefined) {
                            } else if (rateTemp[1].length > 2) {
                                errorMessage = errorMessage + "Rate maksimal memiliki 2 digit dibelakang koma, ";
                            }
                        }
                        if (data[i]["symbol"] === "" || data[i]["symbol"] === undefined) {
                            errorMessage = errorMessage + "Simbol tidak boleh kosong, ";
                        }

                        for (var j = 0; j < currency.length; j++) {
                            if (currency[j]["code"] === data[i]["code"]) {
                                errorMessage = errorMessage + "Kode tidak boleh duplikat, ";
                            }
                             if (currency[j]["description"] === data[i]["description"]) {
                                errorMessage = errorMessage + "Keterangan tidak boleh duplikat";
                            }
                        }
                        if (errorMessage !== "") {
                            dataError.push({ "code": data[i]["code"], "symbol": data[i]["symbol"], "rate": data[i]["rate"], "description": data[i]["description"], "Error": errorMessage });
                        }
                    }
                    if (dataError.length === 0) {
                        var newCurrency = [];
                        for (var i = 0; i < data.length; i++) {
                            var valid = new Currency(data[i]);
                            valid.rate = Number(valid.rate);
                            valid.stamp(this.user.username, 'manager');
                            this.collection.insert(valid)
                                .then(id => {
                                    this.getSingleById(id)
                                        .then(resultItem => {
                                            newCurrency.push(resultItem)
                                            resolve(newCurrency);
                                        })
                                        .catch(e => {
                                            reject(e);
                                        });
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        }
                    } else {
                        resolve(dataError);
                    }
                })
        })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Currency}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.master.collection.Currency}_code`,
            key: {
                code: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}
