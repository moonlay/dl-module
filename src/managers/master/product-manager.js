'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var UomManager = require('./uom-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var Product = DLModels.master.Product;
var UomManager = require('./uom-manager');
var CurrencyManager = require('./currency-manager');

module.exports = class ProductManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Product);
        this.uomManager = new UomManager(db, user);
        this.currencyManager = new CurrencyManager(db, user);
    }

    _getQuery(paging) {
        var deleted = {
            _deleted: false
        };
        var query = paging.keyword ? {
            '$and': [deleted]
        } : deleted;

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var filterCode = {
                'code': {
                    '$regex': regex
                }
            };
            var filterName = {
                'name': {
                    '$regex': regex
                }
            };
            var $or = {
                '$or': [filterCode, filterName]
            };

            query['$and'].push($or);
        }

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
        // 2. begin: Validation.
        return Promise.all([getProductPromise, getUom])
            .then((results) => {
                var _module = results[0];
                var _uom = results[1];

                if (!valid.code || valid.code == '')
                    errors["code"] = i18n.__("Product.code.isRequired:%s is required", i18n.__("Product.code._:Code")); // "Kode tidak boleh kosong.";
                else if (_module) {
                    errors["code"] = i18n.__("Product.code.isExists:%s is already exists", i18n.__("Product.code._:Code")); // "Kode sudah terdaftar.";
                }

                if (!valid.name || valid.name == '')
                    errors["name"] = i18n.__("Product.name.isRequired:%s is required", i18n.__("Product.name._:Name")); // "Nama tidak boleh kosong.";

                if (!valid.uom) {
                    errors["uom"] = i18n.__("Product.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";
                }
                if (valid.uom) {
                    if (!valid.uom.unit || valid.uom.unit == '')
                        errors["uom"] = i18n.__("Product.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";
                }
                else if (_uom){
                    errors["uom"] = i18n.__("Product.uom.noExists:%s is not exists", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";
                }

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('Product Manager : data does not pass validation' + JSON.stringify(errors), errors));
                }

                valid.uom = _uom;
                valid.uomId = new ObjectId(valid.uom._id);
                if (!valid.stamp)
                    valid = new Product(valid);
                valid.stamp(this.user.username, 'manager');
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
            var product, uom, currency;
            this.getProduct()
                .then(results => {
                    this.uomManager.getUOM()
                        .then(uoms => {
                            this.currencyManager.getCurrency()
                                .then(currencies => {
                                    product = results.data;
                                    uom = uoms.data;
                                    currency = currencies.data;
                                    var data = [];
                                    if (dataFile != "") {
                                        for (var i = 1; i < dataFile.length; i++) {
                                            data.push({ "code": dataFile[i][0], "name": dataFile[i][1], "uom": dataFile[i][2], "currency": dataFile[i][3], "price": dataFile[i][4], "description": dataFile[i][5] });
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
                                        var flagUom = false;
                                        for (var j = 0; j < uom.length; j++) {
                                            if (uom[j]["unit"] === data[i]["uom"]) {
                                                flagUom = true;
                                                break;
                                            }
                                        }
                                        if (flagUom === false) {
                                            errorMessage = errorMessage + "Satuan tidak terdaftar di Master Satuan, ";
                                        }
                                        var flagCurrency = false;
                                        for (var j = 0; j < currency.length; j++) {
                                            if (currency[j]["code"] !== data[i]["currency"]) {
                                                flagCurrency = true;
                                                break;
                                            }
                                        }
                                        if (flagCurrency === false) {
                                            errorMessage = errorMessage + "Mata Uang tidak terdaftar di Master Mata Uang";
                                        }

                                        if (errorMessage !== "") {
                                            dataError.push({ "code": data[i]["code"], "name": data[i]["name"], "uom": data[i]["uom"], "currency": data[i]["currency"], "price": data[i]["price"], "description": data[i]["description"], "Error": errorMessage });
                                        }
                                    }
                                    if (dataError.length === 0) {
                                        var newProduct = [];
                                        for (var i = 0; i < data.length; i++) {
                                            var valid = new Product(data[i]);
                                            for (var c = 0; c < currency.length; c++) {
                                                for (var j = 0; j < uom.length; j++) {
                                                    if (data[i]["uom"] == uom[j]["unit"] && data[i]["currency"] == currency[c]["code"]) {
                                                        valid.currency = currency[c];
                                                        valid.uomId = new ObjectId(uom[j]["_id"]);
                                                        valid.uom = uom[j];
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
                                                        break;
                                                    }

                                                }
                                            }
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
};
