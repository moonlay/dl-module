"use strict";

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var OrderType = DLModels.master.OrderType;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var generateCode = require("../../utils/code-generator");

module.exports = class OrderTypeManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.OrderType);
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

    _validate(order) {
        var errors = {};
        var valid = order;
        
        // 1. begin: Declare promises.
        var getorderPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            name: valid.name,
            _deleted: false
        });

        // 2. begin: Validation.
        return Promise.all([getorderPromise])
            .then(results => {
                var _order = results[0];

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("OrderType.name.isRequired:%s is required", i18n.__("OrderType.name._:Name"));//"nama Jenis order tidak boleh kosong";
                else if (_order) {
                    errors["name"] = i18n.__("OrderType.name.isExists:%s is already exists", i18n.__("OrderType.name._:Name")); 
                }

                // if (!valid.name || valid.name == "")
                //     errors["name"] = i18n.__("OrderType.name.isRequired:%s is required", i18n.__("OrderType.name._:Name")); //"Nama Jenis order tidak boleh kosong";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new OrderType(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    
    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.OrderType}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.OrderType}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
