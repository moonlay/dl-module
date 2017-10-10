"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var Storage = DLModels.master.Storage;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var CodeGenerator = require('../../utils/code-generator');
var UnitManager = require('./unit-manager');

module.exports = class StorageManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Storage);
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
                "code": {
                    "$regex": regex
                }
            };
            var nameFilter = {
                "name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, nameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(storage) {
        if(!storage.code){
            storage.code = CodeGenerator();
        }
        storage._active = true;
        return Promise.resolve(storage);
    }

    _validate(storage) {
        var errors = {};
        var valid = storage;
        // 1. begin: Declare promises.
        var getBuyerPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code
        });

        var getUnit = valid.unit && ObjectId.isValid(valid.unit._id) ? this.unitManager.getSingleByIdOrDefault(valid.unit._id) : Promise.resolve(null);
        // 2. begin: Validation.
        return Promise.all([getBuyerPromise, getUnit])
            .then(results => {
                var _module = results[0];
                var _unit=results[1];

                if (_module) {
                    errors["code"] = i18n.__("Storage.code.isExists:%s is already exists", i18n.__("Storage.code._:Code")); //"Kode sudah ada";
                }
                if (!valid.name || valid.name == '')
                    errors["name"] = i18n.__("Storage.name.isRequired:%s is required", i18n.__("Storage.name._:Name")); //"Nama Harus diisi";
                
                if(!_unit){
                     errors["unit"] = i18n.__("Storage.unit.isRequired:%s is required", i18n.__("Storage.unit._:Unit")); //"unit Harus diisi";
                }

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                if (!valid.tempo || valid.tempo == '')
                    valid.tempo = 0;

                if(_unit){
                    valid.unit=_unit;
                    valid.unitId=new ObjectId(_unit._id);
                }
                
                valid = new Storage(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Storage}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Storage}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}
