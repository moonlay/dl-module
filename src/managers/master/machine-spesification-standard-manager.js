'use strict';

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var MachineSpesificationStandard = DLModels.master.MachineSpesificationStandard;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var CodeGenerator = require('../../utils/code-generator');
var UomManager = require('./uom-manager');

module.exports = class MachineSpesificationStandardManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.master.collection.MachineSpesificationStandard);
        this.uomManager = new UomManager(db, user);
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
            var nameFilter = {
                'valueName': {
                    '$regex': regex
                }
            };
            var uomFilter = {
                'uom.unit': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [nameFilter, uomFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        if(!data.code || data.code == "")
            data.code = CodeGenerator();
        return Promise.resolve(data);
    }

    _validate(machine) {
        var errors = {};
        var valid = machine;
        // 1. begin: Declare promises.
        var getMachineSpesificationStandardPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            valueName: valid.valueName
        });
        var getUom = valid.uom && ObjectId.isValid(valid.uom._id) ? this.uomManager.getSingleByIdOrDefault(new ObjectId(valid.uom._id)) : Promise.resolve(null);
        // 2. begin: Validation.
        return Promise.all([getMachineSpesificationStandardPromise, getUom])
            .then(results => {
                var _machineSpesificationStandard = results[0];
                var _uom = results[1];

                // if (!valid.code || valid.code == '')
                //     errors["code"] = i18n.__("Machine.code.isExists:%s is required", i18n.__("Machine.code._:Code")); //"Code harus diisi";

                if (!valid.valueName || valid.valueName == "")
                    errors["valueName"] = i18n.__("MachineSpesificationStandard.valueName.isRequired:%s is required", i18n.__("MachineSpesificationStandard.valueName._:ValueName")); //"Nama Tidak Boleh Kosong";
                else if(_machineSpesificationStandard)
                    errors["valueName"] = i18n.__("MachineSpesificationStandard.valueName.isExist:%s is already exists", i18n.__("MachineSpesificationStandard.valueName._:ValueName")); //"Nama sudah ada";

                if(!valid.uomId || valid.uomId.toString() == "")
                    errors["uom"] = i18n.__("MachineSpesificationStandard.uom.isRequired:%s is required", i18n.__("MachineSpesificationStandard.uom._:Uom")); //"Satuan Tidak Boleh Kosong";
                else if(!_uom)
                    errors["uom"] = i18n.__("MachineSpesificationStandard.uom.isNotExist:%s is not exists", i18n.__("MachineSpesificationStandard.uom._:Uom")); //"Satuan Tidak ditemukan";

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (_uom) {
                    valid.uom = _uom;
                    valid.uomId = new ObjectId(_uom._id);
                }

                if (!valid.stamp)
                    valid = new MachineSpesificationStandard(valid);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.MachineSpesificationStandard}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var valueNameIndex = {
            name: `ix_${map.master.collection.MachineSpesificationStandard}_valueName`,
            key: {
                valueName: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, valueNameIndex]);
    }
}