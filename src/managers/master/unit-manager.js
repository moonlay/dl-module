'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Unit = DLModels.master.Unit;
var BaseManager = require('../base-manager');
var i18n = require('dl-i18n');
var DivisionManager = require('./division-manager');

module.exports = class UnitManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Unit);
        this.divisionManager = new DivisionManager(db, user);
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
            var filterDivisionName = {
                'division.name': {
                    '$regex': regex
                }
            };
            var filterName = {
                'name': {
                    '$regex': regex
                }
            };

            var $or = {
                '$or': [filterDivisionName, filterName]
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
            var getUnitPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    code: valid.code
                }]
            });
            var getDivision = valid.divisionId && (valid.divisionId||'').toString().trim().length > 0 ? this.divisionManager.getSingleByIdOrDefault(valid.divisionId) : Promise.resolve(null);

            // 2. begin: Validation.
            Promise.all([getUnitPromise, getDivision])
                .then(results => {
                    var _unit = results[0];
                    var _division = results[1];

                    if (!valid.code || valid.code == '')
                        errors["code"] = i18n.__("Unit.code.isRequired:%s is required", i18n.__("Unit.code._:Code")); // "Kode tidak boleh kosong.";
                    else if (_unit) {
                        errors["code"] = i18n.__("Unit.code.isExists:%s is already exists", i18n.__("Unit.code._:Code")); // "Kode sudah terdaftar.";
                    }

                    if (!_division)
                        errors["division"] = i18n.__("Unit.division.isRequired:%s is required", i18n.__("Unit.division._:Division")); //"Divisi Tidak Boleh Kosong";

                    if (!valid.name || valid.name == '')
                        errors["name"] = i18n.__("Unit.name.isRequired:%s is required", i18n.__("Unit.name._:Name")); //"Sub Divisi Tidak Boleh Kosong";


                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid = new Unit(unit);
                    valid.divisionId = _division._id;
                    valid.division = _division;

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
            name: `ix_${map.master.collection.Unit}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.master.collection.Unit}_code`,
            key: {
                code: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
