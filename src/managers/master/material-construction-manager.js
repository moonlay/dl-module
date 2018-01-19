"use strict";

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var MaterialConstruction = DLModels.master.MaterialConstruction;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var generateCode = require("../../utils/code-generator");

module.exports = class MaterialConstructionManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.MaterialConstruction);
    }

    
    _beforeInsert(data) {
        if(!data.code)
            data.code = generateCode();
        return Promise.resolve(data);
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
                "name": {
                    "$regex": regex
                }
            };
            var remarkFilter = {
                "remark": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [nameFilter, remarkFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(order) {
        var errors = {};
        var valid = order;
        // 1. begin: Declare promises.
        var getMatConsPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            name: valid.name,
            _deleted: false
        });

        // 2. begin: Validation.
        return Promise.all([getMatConsPromise])
            .then(results => {
                var _constructionMaterial = results[0];

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("MaterialConstruction.name.isRequired:%s is required", i18n.__("MaterialConstruction.name._:Name")); //"Nama konstruksi material tidak boleh kosong";
                else if(_constructionMaterial)
                    errors["name"] = i18n.__("MaterialConstruction.name.isExists:%s is already exists", i18n.__("MaterialConstruction.name._:Name")); //"Nama konstruksi material sudah ada";
                
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if(!valid.stamp)
                    valid = new MaterialConstruction(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.MaterialConstruction}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var nameIndex = {
            name: `ix_${map.master.collection.MaterialConstruction}_name`,
            key: {
                name: 1
            }
        };

        return this.collection.createIndexes([dateIndex, nameIndex]);
    }
}