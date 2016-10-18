'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Currency = DLModels.master.Currency;
var BaseManager = require('../base-manager');
var i18n = require('dl-i18n');

module.exports = class CurrencyManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Currency);
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
            var filterSymbol = {
                'symbol': {
                    '$regex': regex
                }
            };
            var filterDescription = {
                'description': {
                    '$regex': regex
                }
            };
            var $or = {
                '$or': [filterCode, filterSymbol, filterDescription]
            };

            query['$and'].push($or);
        }
        return query;
    }

    _validate(currency) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = currency;
            // 1. begin: Declare promises.
            var getcurrencyPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    code: valid.code
                }]
            });

            // 2. begin: Validation.
            Promise.all([getcurrencyPromise])
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
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid = new Currency(currency);
                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    _createIndexes() {

        var codeIndex = {
            name: `ix_${map.master.collection.Currency}_code`,
            key: {
                code: 1
            },
            unique: true
        }

        return this.collection.createIndexes([codeIndex]);
    }
}