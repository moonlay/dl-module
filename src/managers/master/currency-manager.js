'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Currency = DLModels.master.Currency;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class CurrencyManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Currency);
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
            var symbolFilter = {
                'symbol': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [codeFilter, symbolFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(currency) {
        var errors = {};
        var valid = currency;
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
                    errors["code"] = i18n.__("Currency.code.isRequired:%s is required", i18n.__("Currency.code._:Code")); //"Kode mata uang Tidak Boleh Kosong";
                else if (_currency) {
                    errors["code"] = i18n.__("Currency.code.isExists:%s is already exists", i18n.__("Currency.code._:Code")); //"Kode mata uang sudah terdaftar";
                }

                if (!valid.symbol || valid.symbol == '')
                    errors["symbol"] = i18n.__("Currency.symbol.isRequired:%s is required", i18n.__("Currency.symbol._:Symbol")); //"Simbol mata uang Tidak Boleh Kosong";

                if (!valid.rate || valid.rate == 0)
                    errors["rate"] = i18n.__("Currency.rate.isRequired:%s is required", i18n.__("Currency.rate._:Rate")); //"Rate mata uang Tidak Boleh Kosong";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new Currency(currency);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Currency}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.master.collection.Currency}_code`,
            key: {
                code: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}
