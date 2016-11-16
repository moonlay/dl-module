'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var UomManager = require('./uom-manager');
var BaseManager = require('../base-manager');
var i18n = require('dl-i18n');

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var Product = DLModels.master.Product;
var UomManager = require('./uom-manager');

module.exports = class ProductManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Product);
        this.uomManager = new UomManager(db,user);
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
        return new Promise((resolve, reject) => {
            var valid = product;

            // 1. begin: Declare promises.
            var getProductPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    code: valid.code
                }]
            });
            
            var getUom = valid.uom && valid.uom._id ? this.uomManager.getSingleByIdOrDefault(valid.uom._id) : Promise.resolve(null);
            // 2. begin: Validation.
            Promise.all([getProductPromise, getUom])
                .then(results => {
                    var _module = results[0];
                    var _uom = results[1];

                    if (!valid.code || valid.code == '')
                        errors["code"] = i18n.__("Product.code.isRequired:%s is required", i18n.__("Product.code._:Code")); // "Kode tidak boleh kosong.";
                    else if (_module) {
                        errors["code"] = i18n.__("Product.code.isExists:%s is already exists", i18n.__("Product.code._:Code")); // "Kode sudah terdaftar.";
                    }

                    if (!valid.name || valid.name == '')
                        errors["name"] =  i18n.__("Product.name.isRequired:%s is required", i18n.__("Product.name._:Name")); // "Nama tidak boleh kosong.";

                    if (valid.uom) {
                        if (!valid.uom.unit || valid.uom.unit == '')
                            errors["uom"] = i18n.__("Product.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";
                    }
                    else
                        errors["uom"] = i18n.__("Product.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";

                    // 2c. begin: check if data has any error, reject if it has.
                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('Product Manager : data does not pass validation', errors));
                    }
                    
                    valid.uom=_uom;
                    valid.uomId = new ObjectId(valid.uom._id);
                    if (!valid.stamp)
                        valid = new Product(valid);
                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }
    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Product}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.master.collection.Product}_code`,
            key: {
                code: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
};
