'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Machine = DLModels.master.Machine;
var BaseManager = require('module-toolkit').BaseManager;
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
            var nameFilter = {
                'name': {
                    '$regex': regex
                }
            };
            var processFilter = {
                'process': {
                    '$regex': regex
                }
            };
            var unitNameFilter = {
                'unit.name': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [codeFilter, nameFilter, processFilter, unitNameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = CodeGenerator();
        return Promise.resolve(data);
    }

    _validate(machine) {
        var errors = {};
        var valid = machine;
        // 1. begin: Declare promises.
        var getMachinePromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });

        var getUnit = valid.unit && valid.unit._id ? this.unitManager.getSingleByIdOrDefault(valid.unit._id) : Promise.resolve(null);
        // 2. begin: Validation.
        return Promise.all([getMachinePromise, getUnit])
            .then(results => {
                var _machine = results[0];
                var _unit = results[1];

                // if (!valid.code || valid.code == '')
                //     errors["code"] = i18n.__("Machine.code.isExists:%s is required", i18n.__("Machine.code._:Code")); //"Code harus diisi";
                if (_machine) {
                    errors["code"] = i18n.__("Machine.code.isExists:%s is already exists", i18n.__("Machine.code._:Code")); //"Code sudah ada";
                }

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("Machine.name.isRequired:%s is required", i18n.__("Machine.name._:Name")); //"Nama Tidak Boleh Kosong";

                if (!_unit)
                    errors["unit"] = i18n.__("Machine.unit.isExists:%s is not exists", i18n.__("Machine.unit._:Unit")); //"Unit tidak ada";

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (_unit) {
                    valid.unit = _unit;
                    valid.unitId = new ObjectId(_unit._id);
                }

                if (!valid.stamp)
                    valid = new Machine(valid);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Machine}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Machine}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
};
