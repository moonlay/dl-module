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
            var constructionFilter = {
                'properties.0': {
                    '$regex': keyRegex
                }
            }
            var yarnFilter = {
                'properties.1': {
                    '$regex': keyRegex
                }
            }
            var widthFilter = {
                'properties.2': {
                    '$regex': keyRegex
                }
            }
            var descriptionFilter = {
                'description': {
                    '$regex': keyRegex
                }
            }

            keywordFilter['$or'] = [codeFilter, nameFilter, constructionFilter, yarnFilter, widthFilter, descriptionFilter];
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
            code: valid.code,
            _deleted: false
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
            var products, uoms, currencies;
            this.getProduct()
                .then(results => {
                    this.uomManager.getUOM()
                        .then(_uoms => {
                            this.currencyManager.getCurrency()
                                .then(_currencies => {
                                    products = results.data;
                                    uoms = _uoms.data;
                                    currencies = _currencies.data;
                                    var data = [];
                                    if (dataFile != "") {
                                        for (var i = 1; i < dataFile.length; i++) {
                                            var properties = [];
                                            if (dataFile[i].length >= 8) {
                                                properties.push(dataFile[i][7].trim())
                                                if (dataFile[i].length >= 9) {
                                                    properties.push(dataFile[i][8].trim())
                                                    if (dataFile[i].length >= 10) {
                                                        properties.push(dataFile[i][9].trim())
                                                    }
                                                }
                                            }
                                            data.push({
                                                "code": dataFile[i][0].trim(),
                                                "name": dataFile[i][1].trim(),
                                                "uom": dataFile[i][2].trim(),
                                                "currency": dataFile[i][3].trim(),
                                                "price": dataFile[i][4],
                                                "tags": dataFile[i][5].trim(),
                                                "description": dataFile[i][6].trim(),
                                                "properties": properties
                                            });
                                        }
                                    }

                                    var dataError = [], errorMessage;
                                    for (var i = 0; i < data.length; i++) {
                                        errorMessage = [];
                                        if (data[i]["code"] === "" || data[i]["code"] === undefined) {
                                            errorMessage.push("Kode tidak boleh kosong");
                                        }
                                        if (data[i]["name"] === "" || data[i]["name"] === undefined) {
                                            errorMessage.push("Nama tidak boleh kosong");
                                        }
                                        if (data[i]["uom"] === "" || data[i]["uom"] === undefined) {
                                            errorMessage.push("Satuan tidak boleh kosong");
                                        }
                                        if (isNaN(data[i]["price"])) {
                                            errorMessage.push("Harga harus numerik");
                                        }
                                        var _product = products.find(prd => prd.code == data[i]["code"])
                                        if (_product) {
                                            errorMessage.push("Kode tidak boleh duplikat");
                                        }

                                        var _uom = uoms.find(uom => uom.unit === data[i]["uom"])
                                        if (!_uom) {
                                            errorMessage.push("Satuan tidak terdaftar di Master Satuan");
                                        }

                                        if (errorMessage.length === 1) {
                                            dataError.push({ "code": data[i]["code"], "name": data[i]["name"], "uom": data[i]["uom"], "currency": data[i]["currency"], "price": data[i]["price"], "tags": data[i]["tags"], "description": data[i]["description"], "properties": data[i]["properties"], "Error": errorMessage[0] });
                                        } if (errorMessage.length > 1) {
                                            dataError.push({ "code": data[i]["code"], "name": data[i]["name"], "uom": data[i]["uom"], "currency": data[i]["currency"], "price": data[i]["price"], "tags": data[i]["tags"], "description": data[i]["description"], "properties": data[i]["properties"], "Error": errorMessage.join(', ') });
                                        } else {
                                            data[i]["uom"] = _uom;

                                            if (data[i]["currency"] != "") {
                                                var _currency = currencies.find(currency => currency.code === data[i]["currency"])
                                                data[i]["currency"] = _currency;
                                            }
                                        }
                                    }
                                    if (dataError.length === 0) {
                                        var newProduct = [];
                                        var jobs = [];
                                        for (var prd of data) {
                                            var valid = new Product(prd);
                                            var now = new Date();
                                            valid.currency.rate = Number(valid.currency.rate);
                                            valid.price = Number(valid.price);
                                            valid.uomId = new ObjectId(valid.uom._id);
                                            valid.stamp(this.user.username, 'manager');
                                            valid._createdDate = now;
                                            var job = this.collection.insert(valid)
                                                .then(id => {
                                                    return this.getSingleById(id)
                                                        .then(resultItem => {
                                                            return resultItem;
                                                        })
                                                })
                                            jobs.push(job);
                                        }
                                        Promise.all(jobs)
                                            .then((result) => {
                                                resolve(result);
                                            })
                                            .catch(e => {
                                                reject(e);
                                            });
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
            }
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
