"use strict";

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var Vat = DLModels.master.Vat;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class VatManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Vat);
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
            var nameFilter = {
                'name': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [nameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(vat) {
        var errors = {};
        var valid = vat;
        // 1. begin: Declare promises.
        var getVatPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            name: valid.name,
            rate: valid.rate
        });

        // 2. begin: Validation.
        return Promise.all([getVatPromise])
            .then(results => {
                var _vat = results[0];

                if (_vat) {
                    errors["name"] = i18n.__("Vat.name.isExists:%s is exists", i18n.__("Vat.name._:Name"));
                    errors["rate"] = i18n.__("Vat.rate.isExists:%s is exists", i18n.__("Vat.rate._:Rate"));
                }
                else {
                    if (!valid.name || valid.name == "")
                        errors["name"] = i18n.__("Vat.name.isRequired:%s is required", i18n.__("Vat.name._:Name")); //"Name Tidak Boleh Kosong"; 

                    if (!valid.rate || valid.rate == 0)
                        errors["rate"] = i18n.__("Vat.rate.isRequired:%s is required", i18n.__("Vat.rate._:Rate")); //"Rate Tidak Boleh Kosong";
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new Vat(vat);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }
    getVat() {
        return new Promise((resolve, reject) => {
            var query = {
                _deleted: false
            };

            this.collection
                .where(query)
                .execute()
                .then(vats => {
                    resolve(vats);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var vat;
            this.getVat()
                .then(results => {
                    vat = results.data;
                    var data = [];
                    if (dataFile != "") {
                        for (var i = 1; i < dataFile.length; i++) {
                            data.push({
                                "name": dataFile[i][0].trim(),
                                "rate": dataFile[i][1],
                                "description": dataFile[i][2].trim()
                            });
                        }
                    }
                    var dataError = [], errorMessage;
                    for (var i = 0; i < data.length; i++) {
                        errorMessage = "";
                        if (data[i]["name"] === "" || data[i]["name"] === undefined) {
                            errorMessage = errorMessage + "Nama tidak boleh kosong, ";
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
                        for (var j = 0; j < vat.length; j++) {
                            if (vat[j]["name"] === data[i]["name"] && vat[j]["rate"] === data[i]["rate"]) {
                                errorMessage = errorMessage + "Kombinasi Nama dan Rate tidak boleh sama";
                            }
                        }
                        if (errorMessage !== "") {
                            dataError.push({ "name": data[i]["name"], "rate": data[i]["rate"], "description": data[i]["description"], "Error": errorMessage });
                        }
                    }
                    if (dataError.length === 0) {
                        var newVat = [];
                        for (var i = 0; i < data.length; i++) {
                            var valid = new Vat(data[i]);
                            valid.stamp(this.user.username, 'manager');
                            this.collection.insert(valid)
                                .then(id => {
                                    this.getSingleById(id)
                                        .then(resultItem => {
                                            newVat.push(resultItem)
                                            resolve(newVat);
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
            name: `ix_${map.master.collection.Vat}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var nameRateIndex = {
            name: `ix_${map.master.collection.Vat}_name`,
            key: {
                name: 1,
                rate: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, nameRateIndex]);
    }

}
