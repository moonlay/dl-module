'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var DesignMotive = DLModels.master.DesignMotive;
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var i18n = require('dl-i18n');

module.exports = class DesignMotiveManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.DesignMotive);
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
            keywordFilter['$or'] = [codeFilter, nameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }
    _beforeInsert(motive) {
        motive.code = motive.code === "" ? generateCode() : motive.code;
        return Promise.resolve(motive);
    }
    _validate(motive) {
        var errors = {};
        var valid = motive;
        // 1. begin: Declare promises.
        var getmotivePromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            
            name:valid.name,
            _deleted: false
        });

        // 2. begin: Validation.
        return Promise.all([getmotivePromise])
            .then(results => {
                var _motive = results[0];

                if (!valid.name || valid.name=="")
                    errors["name"] = i18n.__("DesignMotive.name.isRequired:%s is required", i18n.__("DesignMotive.name._:Name")); //"Nama DesignMotive Tidak Boleh Kosong";
                else if (_motive) {
                    errors["name"] = i18n.__("DesignMotive.name.isExists:%s is already exists", i18n.__("DesignMotive.name._:Name")); //"Nama DesignMotive sudah terdaftar";
                }
              
                 if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new DesignMotive(motive);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    
    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.DesignMotive}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.DesignMotive}_code`,
            key: {
                code: 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
