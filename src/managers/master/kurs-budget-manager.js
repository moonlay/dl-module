'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var KursBudget = DLModels.master.KursBudget;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var CurrencyManager = require('../master/currency-manager');

module.exports = class KursBudgetManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.KursBudget);
        this.master = new CurrencyManager(db, user);
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


    getKursBudget() {
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

    _validate(data) {
        var errors = {};
        var valid = data;
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
                    errors["code"] = i18n.__("KursBudget.code.isRequired:%s is required", i18n.__("KursBudget.code._:Code"));

                if (!valid.rate || valid.rate == 0)
                    errors["rate"] = i18n.__("KursBudget.rate.isRequired:%s is required", i18n.__("KursBudget.rate._:Rate"));

                if (!valid.date || valid.date === "") {
                    errors["date"] = i18n.__("KursBudget.date.isRequired:%s is required", i18n.__("KursBudget.date._:date"));
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new KursBudget(data);
                valid.rate = Number(valid.rate);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            })
    }

    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var kursBudget;
            this.master.getCurrency().then(result => {
                var currency = result;
                this.getKursBudget()
                    .then(results => {
                        kursBudget = results.data;
                        var data = [];
                        if (dataFile.data != "") {
                            for (var i = 1; i < dataFile.data.length; i++) {
                                data.push({
                                    "date": new Date(dataFile.date),
                                    "code": dataFile.data[i][0].trim(),
                                    "rate": dataFile.data[i][1].trim()
                                });
                            }
                        }
                        var dataError = [], errorMessage;
                        for (var i = 0; i < data.length; i++) {
                            errorMessage = "";

                            if (data[i]["code"] === "" || data[i]["code"] === undefined) {
                                errorMessage = errorMessage + "Mata Uang tidak boleh kosong, ";
                            }
                            else if (!(currency.data.find(o => o.code == data[i]["code"]))) {
                                errorMessage = errorMessage + "Mata Uang tidak terdaftar dalam master Mata Uang,";
                            }


                            if (data[i]["date"] === "" || data[i]["date"] === undefined || data[i]["date"].toString() == "Invalid Date") {
                                errorMessage = errorMessage + "Tanggal tidak boleh kosong, ";
                            }
                            else if (data[i]["date"] > new Date()) {
                                errorMessage = errorMessage + "Tanggal tidak boleh lebih dari tanggal hari ini, ";
                            }

                            if (data[i]["rate"] === "" || data[i]["rate"] === undefined) {
                                errorMessage = errorMessage + "Kurs tidak boleh kosong, ";
                            } else if (isNaN(data[i]["rate"])) {
                                errorMessage = errorMessage + "Kurs harus numerik, ";
                            }
                            else {
                                var rateTemp = (data[i]["rate"]).toString().split(".");
                                if (rateTemp[1] === undefined) {
                                } else if (rateTemp[1].length > 4) {
                                    errorMessage = errorMessage + "Kurs maksimal memiliki 4 digit dibelakang koma, ";
                                }
                            }

                            for (var j = 0; j < kursBudget.length; j++) {

                                if (kursBudget[j]["code"] === data[i]["code"] && kursBudget[j]["date"].toString() === data[i]["date"].toString()) {
                                    errorMessage = errorMessage + "Mata Uang dan Tanggal tidak boleh duplikat, ";
                                }
                            }
                            if (errorMessage !== "") {
                                dataError.push({ "Mata Uang": data[i]["code"], "Kurs": data[i]["rate"], "Tangga": data[i]["date"], "Error": errorMessage });
                            }
                        }
                        if (dataError.length === 0) {
                            var newKursBudget = [];
                            for (var i = 0; i < data.length; i++) {
                                var valid = new KursBudget(data[i]);
                                valid.date = valid.date;
                                valid.code = valid.code;
                                valid.rate = Number(valid.rate);
                                valid.stamp(this.user.username, 'manager');
                                this.collection.insert(valid)
                                    .then(id => {
                                        this.getSingleById(id)
                                            .then(resultItem => {
                                                newKursBudget.push(resultItem)
                                                resolve(newKursBudget);
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

        })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.KursBudget}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var date2Index = {
            name: `ix_${map.master.collection.KursBudget}__date`,
            key: {
                date: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.master.collection.KursBudget}_code`,
            key: {
                code: 1
            },
            unique: false
        }

        return this.collection.createIndexes([dateIndex, codeIndex, date2Index]);
    }
}
