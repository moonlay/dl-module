'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var UomManager = require('./uom-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var assert = require('assert');

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var Product = DLModels.master.Product;
var UomManager = require('./uom-manager');
var CurrencyManager = require('./currency-manager');

module.exports = class GarmentProductManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.GarmentProduct);
        this.uomManager = new UomManager(db, user);
        this.currencyManager = new CurrencyManager(db, user);
    }

    _getQuery(paging) {
        var _default = {
            _deleted: false,

        },
            pagingFilter = paging.filter || {},
            keywordFilter = {},

            query = {};

        if (paging.keyword) {
            var keyRegex = new RegExp(paging.keyword, "i");
            var codeFilter = {
                'code': {
                    '$regex': keyRegex
                }
            };
            var nameFilter = {
                'name': {
                    '$regex': keyRegex
                }
            };

            keywordFilter['$or'] = [codeFilter, nameFilter];
        }


        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(product) {
        var errors = {};
        var valid = product;

        // 1. begin: Declare promises.
        var getProductPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });

        var getUom = valid.uom && ObjectId.isValid(valid.uom._id) ? this.uomManager.getSingleByIdOrDefault(valid.uom._id) : Promise.resolve(null);
        var getCurrency = valid.currency && ObjectId.isValid(valid.currency._id) ? this.currencyManager.getSingleByIdOrDefault(valid.currency._id) : Promise.resolve(null);

        // 2. begin: Validation.
        return Promise.all([getProductPromise, getUom, getCurrency])
            .then((results) => {
                var _module = results[0];
                var _uom = results[1];
                var _currency = results[2];

                if (!valid.code || valid.code == '') {
                    errors["code"] = i18n.__("Product.code.isRequired:%s is required", i18n.__("Product.code._:Code")); // "Kode tidak boleh kosong.";
                } else if (_module) {
                    errors["code"] = i18n.__("Product.code.isExists:%s is already exists", i18n.__("Product.code._:Code")); // "Kode sudah terdaftar.";
                }

                if (!valid.name || valid.name == '') {
                    errors["name"] = i18n.__("Product.name.isRequired:%s is required", i18n.__("Product.name._:Name")); // "Nama tidak boleh kosong.";
                }
                if (!valid.uom) {
                    errors["uom"] = i18n.__("Product.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";
                }
                if (valid.uom) {
                    if (!valid.uom.unit || valid.uom.unit == '')
                        errors["uom"] = i18n.__("Product.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";
                }
                else if (_uom) {
                    errors["uom"] = i18n.__("Product.uom.noExists:%s is not exists", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";
                }

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('Product Manager : data does not pass validation' + JSON.stringify(errors), errors));
                }
                if (!valid.stamp) {
                    valid = new Product(valid);
                }
                valid.stamp(this.user.username, 'manager');

                valid.uom = _uom;
                valid.uomId = new ObjectId(valid.uom._id);
                if (_currency) {
                    valid.currency = _currency;
                }
                valid.currency.rate = Number(valid.currency.rate);
                valid.price = Number(valid.price);
                return Promise.resolve(valid);
            });
    }

    getProduct() {
        return new Promise((resolve, reject) => {
            var query = {
                _deleted: false
            };
            this.collection
                .where(query)
                .execute()
                .then(products => {
                    resolve(products);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var product, uoms, currencies;
            this.getProduct()
                .then(results => {
                    this.uomManager.getUOM()
                        .then(_uoms => {
                            this.currencyManager.getCurrency()
                                .then(_currencies => {
                                    product = results.data;
                                    uoms = _uoms.data;
                                    currencies = _currencies.data;
                                    var data = [];
                                    if (dataFile != "") {
                                        for (var i = 1; i < dataFile.length; i++) {
                                            data.push({
                                                "code": dataFile[i][0].trim(),
                                                "name": dataFile[i][1].trim(),
                                                "uom": dataFile[i][2].trim(),
                                                "currency": dataFile[i][3].trim(),
                                                "price": dataFile[i][4],
                                                "tags": dataFile[i][5].trim(),
                                                "description": dataFile[i][6].trim()
                                            });
                                        }
                                    }

                                    var dataError = [], errorMessage;
                                    for (var i = 0; i < data.length; i++) {
                                        errorMessage = "";
                                        if (data[i]["code"] === "" || data[i]["code"] === undefined) {
                                            errorMessage = errorMessage + "Kode tidak boleh kosong, ";
                                        }
                                        if (data[i]["name"] === "" || data[i]["name"] === undefined) {
                                            errorMessage = errorMessage + "Nama tidak boleh kosong, ";
                                        }
                                        if (data[i]["uom"] === "" || data[i]["uom"] === undefined) {
                                            errorMessage = errorMessage + "Satuan tidak boleh kosong, ";
                                        }
                                        if (data[i]["currency"] === "" || data[i]["currency"] === undefined) {
                                            errorMessage = errorMessage + "Mata Uang tidak boleh kosong, ";
                                        }
                                        if (data[i]["price"] === "" || data[i]["price"] === undefined) {
                                            errorMessage = errorMessage + "Harga tidak boleh kosong, ";
                                        } else if (isNaN(data[i]["price"])) {
                                            errorMessage = errorMessage + "Harga harus numerik, ";
                                        }
                                        else {
                                            var rateTemp = (data[i]["price"]).toString().split(".");
                                            if (rateTemp[1] === undefined) {
                                            } else if (rateTemp[1].length > 2) {
                                                errorMessage = errorMessage + "Harga maksimal memiliki 2 digit dibelakang koma, ";
                                            }
                                        }
                                        for (var j = 0; j < product.length; j++) {
                                            if (product[j]["code"] === data[i]["code"]) {
                                                errorMessage = errorMessage + "Kode tidak boleh duplikat, ";
                                            }
                                            if (product[j]["name"] === data[i]["name"]) {
                                                errorMessage = errorMessage + "Nama tidak boleh duplikat, ";
                                            }
                                        }
                                        // var flagUom = false;
                                        var _uom = uoms.find(uom => uom.unit === data[i]["uom"])
                                        if (!_uom) {
                                            errorMessage = errorMessage + "Satuan tidak terdaftar di Master Satuan, ";
                                        }

                                        var _currency = currencies.find(currency => currency.code === data[i]["currency"])
                                        if (!_currency) {
                                            errorMessage = errorMessage + "Mata Uang tidak terdaftar di Master Mata Uang";
                                        }

                                        if (errorMessage !== "") {
                                            dataError.push({ "code": data[i]["code"], "name": data[i]["name"], "uom": data[i]["uom"], "currency": data[i]["currency"], "price": data[i]["price"], "tags": data[i]["tags"], "description": data[i]["description"], "Error": errorMessage });
                                        } else {
                                            data[i]["currency"] = _currency;
                                            data[i]["uom"] = _uom;
                                        }
                                    }
                                    if (dataError.length === 0) {
                                        var newProduct = [];
                                        for (var i = 0; i < data.length; i++) {
                                            var valid = new Product(data[i]);
                                            valid.currency.rate = Number(valid.currency.rate);
                                            valid.price = Number(valid.price);
                                            valid.uomId = new ObjectId(valid.uom._id);
                                            valid.stamp(this.user.username, 'manager');
                                            this.collection.insert(valid)
                                                .then(id => {
                                                    this.getSingleById(id)
                                                        .then(resultItem => {
                                                            newProduct.push(resultItem)
                                                            resolve(newProduct);
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
        })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Product}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Product}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    getProductByTags(key, tag) {
        return new Promise((resolve, reject) => {
            var regex = new RegExp(key, "i");
            var regex2 = new RegExp(tag, "i");
            this.collection.aggregate(
                [{
                    $match: {
                        $and: [{
                            $and: [{
                                "tags": regex2
                            }, {
                                    "_deleted": false
                                }]
                        }, {
                                "name": {
                                    "$regex": regex
                                }
                            }]
                    }
                }]
            )
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    resolve(result);
                });
        });
    }

    readById(paging) {
        var _paging = Object.assign({
            order: {},
            filter: {},
            select: []
        }, paging);

        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(_paging.filter)
                    .select(_paging.select)
                    .order(_paging.order)
                    .execute();
            });
    }
};
