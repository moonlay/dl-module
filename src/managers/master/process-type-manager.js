"use strict";

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require("dl-models");
var map = DLModels.map;
var ProcessType = DLModels.master.ProcessType;
var OrderTypeManager = require('../master/order-type-manager');
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var generateCode = require("../../utils/code-generator");

module.exports = class ProcessTypeManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.ProcessType);
        this.orderManager = new OrderTypeManager(db, user);
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

            var orderNameFilter ={
                "orderType.name":{
                    "$regex": regex
                }
            }
            keywordFilter["$or"] = [codeFilter, nameFilter, orderNameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(process) {
        var errors = {};
        var valid = process;
        // 1. begin: Declare promises.
        var getprocessPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            name: valid.name,
            _deleted: false
        });

        var getOrder = ObjectId.isValid(valid.orderTypeId) ? this.orderManager.getSingleByIdOrDefault(new ObjectId(valid.orderTypeId)) : Promise.resolve(null);

        // 2. begin: Validation.
        return Promise.all([getprocessPromise, getOrder])
            .then(results => {
                var _process= results[0];
                var _order = results[1];

                if (_process) {
                    errors["name"] = i18n.__("ProcessType.name.isExists:%s is already exists", i18n.__("ProcessType.name._:Name")); 
                }

                if (!_order) {
                    errors["order"] = i18n.__("ProcessType.order.isRequired:%s is not exists", i18n.__("ProcessType.order._:orderType"));
                }

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("ProcessType.name.isRequired:%s is required", i18n.__("ProcessType.name._:Name")); //"Nama Jenis proses tidak boleh kosong";

               
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new ProcessType(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    
    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.ProcessType}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.ProcessType}_code`,
            key: {
                code: 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
