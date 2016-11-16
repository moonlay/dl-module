'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var UsterClassification = DLModels.master.UsterClassification;
var ProductManager = require('./product-manager');
var BaseManager = require('../base-manager');
var i18n = require('dl-i18n');

module.exports = class UsterClassificationManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.master.collection.UsterClassification);
        this.productManager = new ProductManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var filterCode = {
                'thread.code': {
                    '$regex': regex
                }
            };
            var filterName = {
                'thread.name': {
                    '$regex': regex
                }
            };
            keywordFilter = {
                '$or': [filterCode, filterName]
            };
        }

        query = {'$and' : [deletedFilter, paging.filter, keywordFilter]};
        return query;
    }

    getProductInUster(paging){
        var _paging = Object.assign({
            order: {},
            filter: {},
            asc: true
        }, paging);
        // var start = process.hrtime();

        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    var query = this._getQuery(_paging);
                    this.collection
                        .distinct("threadName", query)
                        .then(result => {
                            resolve(result);
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

    _validate(usterClassification) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = usterClassification;
            var now = new Date();
            // 1. begin: Declare promises.
            var getUster = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    _deleted : false
                },{
                    productId : new Object(valid.productId)
                },{
                    grade : valid.grade
                }]   
            });
            var getProduct = valid.thread && valid.thread._id ? this.productManager.getSingleByIdOrDefault(valid.thread._id) : Promise.resolve(null);
            // 2. begin: Validation.
            Promise.all([getUster, getProduct])
                .then(result =>{
                    var _uster = result[0];
                    var _product = result[1];

                    if(!valid.threadName)
                        errors["threadName"] = i18n.__("usterClassification.threadName.isRequired:%s is required", i18n.__("usterClassification.threadName._:ThreadName")); //"Nama Benang tidak boleh kosong";

                    if (!valid.thread)
                        errors["thread"] = i18n.__("usterClassification.thread.name.isRequired:%s is required", i18n.__("usterClassification.thread.name._:Thread")); //"product Benang tidak boleh kosong";
                    else if(!_product)
                        errors["thread"] = i18n.__("usterClassification.thread.name.isRequired:%s is not exists", i18n.__("usterClassification.thread.name._:Thread")); //"Benang sudah tidak ada di master produk";
                    else if(_uster)
                        errors["thread"] = i18n.__(`usterClassification.thread.name.isRequired:%s with grade ${valid.grade} is already exists`, i18n.__("usterClassification.thread.name._:Thread")); //"Produk Benang dengan grade yang dipilih sudah ada di database";
                    
                    if (!valid.grade || valid.grade == "")
                        errors["grade"] = i18n.__("usterClassification.grade.isRequired:%s is required", i18n.__("usterClassification.grade._:Grade")); //"grade tidak boleh kosong";
                    
                    // 2c. begin: check if data has any error, reject if it has.
                     if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }
                    if (!valid.thin)
                        valid.thin = 0;
                    if (!valid.thick)
                        valid.thick = 0;
                    if (!valid.neps)
                        valid.neps = 0;

                    valid.ipi = valid.thin + valid.thick + valid.neps;
                    valid.thread = _product;
                    valid.productId = new ObjectId(valid.thread._id);
                    if(!valid.stamp)
                        valid = new UsterClassification(valid);
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
            name: `ix_${map.master.collection.UsterClassification}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.master.collection.UsterClassification}_productId`,
            key: {
                productId: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}