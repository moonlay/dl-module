'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var UsterClassification = DLModels.master.UsterClassification;
var Uster = DLModels.master.Uster;
var ProductManager = require('./product-manager');
var CodeGenerator = require('../../utils/code-generator');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class UsterManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.master.collection.Uster);
        this.productManager = new ProductManager(db, user);
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

            var filterCode = {
                'code': {
                    '$regex': regex
                }
            };
            var filterProductCode = {
                'product.code': {
                    '$regex': regex
                }
            };
            var filterProductName = {
                'product.name': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [filterCode, filterProductCode, filterProductName];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(uster) {
        var errors = {};
        var valid = uster;
        // 1. begin: Declare promises.
        var getUster = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            productId: ObjectId.isValid(valid.productId) ? new ObjectId(valid.productId) : new ObjectId()
        });

        var getProduct = ObjectId.isValid(valid.productId) ? this.productManager.getSingleByIdOrDefault(valid.productId) : Promise.resolve(null);

        // 2. begin: Validation.
        return Promise.all([getUster, getProduct])
            .then(result => {
                var _uster = result[0];
                var _product = result[1];

                if (_uster)
                    errors["product"] = i18n.__("Uster.product.isExists:%s is exists in other uster", i18n.__("Uster.product._:Product")); //"Benang sudah tidak ada di master produk";
                else if (!_product)
                    errors["product"] = i18n.__("Uster.product.isNotExists:%s is not exists", i18n.__("Uster.product._:Product")); //"Benang sudah tidak ada di master produk";

                valid.classifications = valid.classifications || [];
                if (valid.classifications.length > 0) {
                    var classificationErrors = [];
                    for (var classification of valid.classifications) {
                        var classificationError = {};
                        if (!classification.grade || classification.grade == '') {
                            classificationError["grade"] = i18n.__("Uster.classifications.grade.isRequired:%s is required", i18n.__("Uster.classifications.grade._:Grade"));
                        }

                        if (Object.getOwnPropertyNames(classificationError).length > 0) {
                            classificationErrors.push(classificationError);
                        }
                    }
                    if (classificationErrors.length > 0) {
                        errors["classifications"] = classificationErrors;
                    }
                }
                else {
                    errors["classifications"] = i18n.__("Uster.classifications.isRequired:%s is required", i18n.__("Uster.classifications._:Classifications")); //"Harus ada minimal 1 klasifikasi";
                }

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }
                if (!valid.code)
                    valid.code = CodeGenerator();

                for (var classification of valid.classifications) {
                    classification.thin = parseInt(classification.thin || "0", 10);
                    classification.thick = parseInt(classification.thick || "0", 10);
                    classification.neps = parseInt(classification.neps || "0", 10);
                    classification.ipi = classification.thin + classification.thick + classification.neps;
                }

                valid.productId = _product._id;
                valid.product = _product;
                
                if (!valid.stamp)
                    valid = new Uster(valid);
                    
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Uster}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var productIdIndex = {
            name: `ix_${map.master.collection.Uster}_productId`,
            key: {
                productId: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, productIdIndex]);
    }
};
