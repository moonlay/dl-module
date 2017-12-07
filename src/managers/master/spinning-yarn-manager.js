"use strict";

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var SpinningYarn = DLModels.master.SpinningYarn;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var generateCode = require("../../utils/code-generator");

module.exports = class SpinningYarnManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.SpinningYarn);
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

    _beforeInsert(yarn) {
        if(!yarn.code){
            yarn.code = CodeGenerator();
        }
        yarn._active = true;
        return Promise.resolve(yarn);
    }

    _validate(yarn) {
        var errors = {};
        var valid = yarn;
        // 1. begin: Declare promises.
        var getSpinningYarnPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            name: valid.name,
            code:valid.code,
            _deleted: false
        });

        // 2. begin: Validation.
        return Promise.all([getSpinningYarnPromise])
            .then(results => {
                var _yarn = results[0];

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("SpinningYarn.name.isRequired:%s is required", i18n.__("SpinningYarn.name._:Name")); //"Nama benang tidak boleh kosong";
                else if(_yarn){
                    errors["name"] = i18n.__("SpinningYarn.name.isExists:%s is already exists", i18n.__("SpinningYarn.name._:Name")); //"Nama benang sudah ada";
                    errors["code"] = i18n.__("SpinningYarn.code.isExists:%s is already exists", i18n.__("SpinningYarn.code._:Code")); //"Code benang sudah ada";
                }
                
                if (!valid.code || valid.code == "")
                    errors["code"] = i18n.__("SpinningYarn.code.isRequired:%s is required", i18n.__("SpinningYarn.code._:Code")); //"code benang tidak boleh kosong";
                    
                if (!valid.ne || valid.ne <= 0)
                    errors["ne"] = i18n.__("SpinningYarn.ne.isRequired:%s is required", i18n.__("SpinningYarn.ne._:Ne")); //"ne tidak boleh kosong";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if(!valid.stamp)
                    valid = new SpinningYarn(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.SpinningYarn}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var nameIndex = {
            name: `ix_${map.master.collection.SpinningYarn}_name_code`,
            key: {
                name: 1,
                code: 1
            }
        };

        return this.collection.createIndexes([dateIndex, nameIndex]);
    }
}