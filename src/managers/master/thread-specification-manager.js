"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var ThreadSpecification = DLModels.master.ThreadSpecification;
var ProductManager = require("../master/product-manager");
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class ThreadSpecificationManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.ThreadSpecification);
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
            var productNameFilter = {
                "product.name": {
                    "$regex": regex
                }
            };
            var productCodeFilter = {
                "product.code": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [productNameFilter, productCodeFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(threadSpecification) {
        var errors = {};
        var valid = threadSpecification;
        // 1. begin: Declare promises.
        var getThreadSpecificationPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            productId: new ObjectId(valid.productId)
        });

        var getProduct = valid.productId && ObjectId.isValid(valid.productId) ? this.productManager.getSingleByIdOrDefault(valid.productId) : Promise.resolve(null);

        return Promise.all([getThreadSpecificationPromise, getProduct])
            .then(results => {
                var _threadSpecification = results[0];
                var _product = results[1];

                if (_threadSpecification)
                    errors["product"] = i18n.__("ThreadSpecification.product.isExists:%s is exists", i18n.__("ThreadSpecification.product._:Product"));
                else if (!_product)
                    errors["product"] = i18n.__("ThreadSpecification.product.isNotExists:%s is not exists", i18n.__("ThreadSpecification.product._:Product"));
                else if (!valid.productId)
                    errors["product"] = i18n.__("ThreadSpecification.product.isRequired:%s is required", i18n.__("ThreadSpecification.product._:Product"));

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new ThreadSpecification(threadSpecification);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.ThreadSpecification}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.ThreadSpecification}_productId`,
            key: {
                productId: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
};
