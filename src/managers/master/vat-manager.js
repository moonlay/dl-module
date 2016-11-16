'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Vat = DLModels.master.Vat;
var BaseManager = require('../base-manager');
var i18n = require('dl-i18n');

module.exports = class VatManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Vat);
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
             var filterName = {
                'name': {
                    '$regex': regex
                }
            };
            var filterRate = {
                'rate': {
                    '$regex': regex
                }
            };

            var $or = {
                '$or': [filterName, filterRate]
            };

            query['$and'].push($or);
        }
        return query;
    }
    
    _validate(vat) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = vat;
            // 1. begin: Declare promises.
            var getVatPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        name: valid.name,
                        rate: valid.rate
                    }]
            });

            // 2. begin: Validation.
            Promise.all([getVatPromise])
                .then(results => {
                    var _vat = results[0];

                    if (!valid.name || valid.name == '')
                        errors["name"] =  i18n.__("Vat.name.isRequired:%s is required", i18n.__("Vat.name._:Name"));//"Name Tidak Boleh Kosong"; 
                    
                   if (!valid.rate || valid.rate == 0)
                        errors["rate"] = i18n.__("Vat.rate.isRequired:%s is required", i18n.__("Vat.rate._:Rate"));//"Rate Tidak Boleh Kosong";
                    

                     if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid = new Vat(vat);
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
            name: `ix_${map.master.collection.Vat}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var nameRateIndex = {
            name: `ix_${map.master.collection.Vat}_name`,
            key: {
                name: 1,
                rate: 1
            },
            unique: true
        } 

        return this.collection.createIndexes([dateIndex, nameRateIndex]);
    }
 
}