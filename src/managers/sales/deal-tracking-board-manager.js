"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');
var DLModels = require("dl-models");
var map = DLModels.map;
var CurrencyManager = require('../master/currency-manager');
var generateCode = require("../../utils/code-generator");
var DealTrackingBoard = DLModels.sales.DealTrackingBoard;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class DealTrackingBoardManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.sales.collection.DealTrackingBoard);
        this.currencyManager = new CurrencyManager(db, user);
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
            var titleFilter = {
                "title": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [titleFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _validate(dealTrackingBoard) {
        var errors = {};
        var valid = dealTrackingBoard;
        
        var getCurrency = valid.currency && ObjectId.isValid(valid.currency._id) ? this.currencyManager.getSingleByIdOrDefault(valid.currency._id) : Promise.resolve(null);

        return Promise.all([getCurrency])
            .then(results => {
                var _currency = results[0];

                if (!valid.title || valid.title == "")
                    errors["title"] = i18n.__("DealTrackingBoard.title.isRequired:%s is required", i18n.__("DealTrackingBoard.title._:Title")); //"Judul harus diisi";
                
                if (!valid.currency)
                    errors["currency"] = i18n.__("DealTrackingBoard.currency.isRequired:%s is required", i18n.__("DealTrackingBoard.currency._:Currency")); //"Mata uang harus diisi";
                else if (!_currency)
                    errors["currency"] = i18n.__("DealTrackingBoard.currency.notFound:%s not found", i18n.__("DealTrackingBoard.currency._:Currency")); //"Mata uang tidak ditemukan";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid.currencyId = new ObjectId(valid.currency._id);
                
                if (!valid.stamp) {
                    valid = new DealTrackingBoard(valid);
                }
               
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.sales.collection.DealTrackingBoard}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var deletedIndex = {
            name: `ix_${map.sales.collection.DealTrackingBoard}__deleted`,
            key: {
                _deleted: 1
            }
        };

        return this.collection.createIndexes([dateIndex, deletedIndex]);
    }

    read(paging) {
        var _paging = Object.assign({
            select: ["title"]
        }, paging);

        return this._createIndexes()
            .then((createIndexResults) => {
                var query = this._getQuery(_paging);
                return this.collection
                    .where(query)
                    .select(_paging.select)
                    .execute();
            });
    }
};