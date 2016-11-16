'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Division = DLModels.master.Division;
var BaseManager = require('../base-manager');
var i18n = require('dl-i18n');

module.exports = class DivisionManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Division);
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
            var filterDivision = {
                'name': {
                    '$regex': regex
                }
            };
            var filterSubDivision = {
                'name': {
                    '$regex': regex
                }
            };

            var $or = {
                '$or': [filterDivision, filterSubDivision]
            };

            query['$and'].push($or);
        }
        return query;
    }

    _validate(unit) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = unit;
            // 1. begin: Declare promises.
            var getunitPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    code: valid.code
                }]
            });

            // 2. begin: Validation.
            Promise.all([getunitPromise])
                .then(results => {
                    var _division = results[0];

                    if (!valid.code || valid.code == '')
                        errors["code"] = i18n.__("Division.code.isRequired:%s is required", i18n.__("Division.code._:Code")); //"Divisi Tidak Boleh Kosong";
                    else if (_division) {
                        errors["code"] = i18n.__("Division.code.isExists:%s is already exists", i18n.__("Division.code._:Code")); //"Perpaduan Divisi dan Sub Divisi sudah terdaftar";
                    }

                    if (!valid.name || valid.name == '')
                        errors["name"] = i18n.__("Division.name.isRequired:%s is required", i18n.__("Division.name._:Name")); //"Sub Divisi Tidak Boleh Kosong";

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid = new Division(unit);
                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
    
    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Unit}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Unit}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
