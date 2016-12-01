'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Uom = DLModels.master.Uom;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class UomManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.uom);
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
            var unitFilter = {
                'unit': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [unitFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(uom) {
        var errors = {};
        var valid = uom;
        // 1. begin: Declare promises.
        var getUomPromise = (valid.unit || "").trim().length > 0 ? this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            unit: valid.unit
        }) : Promise.resolve(null);


        // 2. begin: Validation.
        return Promise.all([getUomPromise])
            .then(results => {
                var _uom = results[0];

                if (!valid.unit || valid.unit == '')
                    errors["unit"] = i18n.__("Uom.unit.isRequired:%s is required", i18n.__("Uom.unit._:Unit")); //"Satuan Tidak Boleh Kosong";
                else if (_uom) {
                    errors["unit"] = i18n.__("Uom.unit.isExists:%s is already exists", i18n.__("Uom.unit._:Unit")); //"Satuan sudah terdaftar";
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new Uom(uom);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }
    
    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.uom}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var unitIndex = {
            name: `ix_${map.master.collection.uom}_unit`,
            key: {
                unit: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, unitIndex]);
    }

}
