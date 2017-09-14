'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Currency = DLModels.garmentPurchasing.GarmentCurrency;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class GarmentCurrencyManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentCurrency);
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

            keywordFilter['$or'] = [codeFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
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

    //_validate(data){

    // }

    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var currency;
            this.getCurrency()
                .then(results => {
                    currency = results.data;
                    var data = [];
                    if (dataFile.data != "") {
                        for (var i = 1; i < dataFile.data.length; i++) {
                            data.push({
                                "date": new Date(dataFile.date),
                                "code": dataFile.data[i][0].trim(),
                                "rate": dataFile.data[i][1].trim(),

                            });
                        }
                    }
                    var dataError = [], errorMessage;
                    for (var i = 0; i < data.length; i++) {
                        errorMessage = "";
                        if (data[i]["code"] === "" || data[i]["code"] === undefined) {
                            errorMessage = errorMessage + "Mata Uang tidak boleh kosong, ";
                        }

                        if (data[i]["rate"] === "" || data[i]["rate"] === undefined) {
                            errorMessage = errorMessage + "Kurs tidak boleh kosong, ";
                        } else if (isNaN(data[i]["rate"])) {
                            errorMessage = errorMessage + "Kurs harus numerik, ";
                        }
                        else {
                            var rateTemp = (data[i]["rate"]).toString().split(".");
                            if (rateTemp[1] === undefined) {
                            } else if (rateTemp[1].length > 2) {
                                errorMessage = errorMessage + "Kurs maksimal memiliki 2 digit dibelakang koma, ";
                            }
                        }

                        for (var j = 0; j < currency.length; j++) {
                            if (currency[j]["code"] === data[i]["code"]) {
                                errorMessage = errorMessage + "Mata Uang tidak boleh duplikat, ";
                            }
                        }
                        if (errorMessage !== "") {
                            dataError.push({ "Mata Uang": data[i]["code"], "Kurs": data[i]["rate"], "Error": errorMessage });
                        }
                    }
                    if (dataError.length === 0) {
                        var newCurrency = [];
                        for (var i = 0; i < data.length; i++) {
                            var valid = new Currency(data[i]);
                            valid.date = valid.date;
                            valid.code = valid.code;
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
