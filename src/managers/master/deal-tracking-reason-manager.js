"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var generateCode = require("../../utils/code-generator");
var map = DLModels.map;
var DealTrackingReason = DLModels.master.DealTrackingReason;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class DealTrackingReasonManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.DealTrackingReason);
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
            var reasonFilter = {
                "reason": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, reasonFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
    
        return Promise.resolve(data);
    }

    _validate(dealTrackingReason) {
        var errors = {};
        var valid = dealTrackingReason;
        // 1. begin: Declare promises.
        var getDealTrackingReasonPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code
        });
        // 2. begin: Validation.
        return Promise.all([getDealTrackingReasonPromise])
            .then(results => {
                var _duplicateDealTrackingReason = results[0];

                if (_duplicateDealTrackingReason) {
                    errors["code"] = i18n.__("DealTrackingReason.code.isExists:%s is already exists", i18n.__("DealTrackingReason.code._:Code")); //"Kode sudah ada";
                }

                if (!valid.reason || valid.reason == '')
                    errors["reason"] = i18n.__("DealTrackingReason.reason.isRequired:%s is required", i18n.__("DealTrackingReason.reason._:Reason")); //"Keterangan Harus diisi";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                
                if (!valid.stamp) {
                    valid = new DealTrackingReason(valid);
                }
               
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.DealTrackingReason}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.DealTrackingReason}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}