'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Machine = DLModels.master.Machine;
var BaseManager = require('../base-manager');
var i18n = require('dl-i18n');
var CodeGenerator = require('../../utils/code-generator');
var UnitManager = require('./unit-manager');

module.exports = class MachineManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.master.collection.Machine);
        this.unitManager = new UnitManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};

        var query = {};
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
            keywordFilter = {
                '$or': [filterCode, filterName]
            };
        }

        query = {'$and' : [deletedFilter, paging.filter, keywordFilter]};
        return query;
    }

    _validate(machine) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = machine;
            // 1. begin: Declare promises.
            var getMachinePromise = this.collection.singleOrDefault({
                "$and": [{
                        _id: {
                            '$ne': new ObjectId(valid._id)
                        }
                    }, {
                        name: valid.name
                    }, {
                        _deleted:false
                }]
            });
            var getUnit = valid.unit && valid.unit._id ? this.unitManager.getSingleByIdOrDefault(valid.unit._id) : Promise.resolve(null);
            // 2. begin: Validation.
            Promise.all([getMachinePromise, getUnit])
                .then(results => {
                    var _machine = results[0];
                    var _unit = results[1];
                    valid.code = CodeGenerator();
                    
                    if (!valid.name || valid.name == '')
                        errors["name"] = i18n.__("Machine.name.isExists:%s is required", i18n.__("Machine.name._:Name")); //"Nama harus diisi";
                    else if (_machine) {
                        errors["name"] = i18n.__("Machine.name.isExists:%s is already exists", i18n.__("Machine.name._:Name")); //"Nama sudah ada";
                    }
                    if(!_unit)
                        errors["unit"] = i18n.__("Machine.unit.isExists:%s is not exists", i18n.__("Machine.unit._:Unit")); //"Unit tidak ada";

                    // 2c. begin: check if data has any error, reject if it has.
                     if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    if(_unit){
                        valid.unit = _unit;
                        valid.unitId = new ObjectId(_unit._id);
                    }

                    if(!valid.stamp)
                        valid = new Machine(valid);
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
            name: `ix_${map.master.collection.Machine}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.master.collection.Machine}_code`,
            key: {
                code: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}