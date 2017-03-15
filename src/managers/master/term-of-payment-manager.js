"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var TermOfPayment = DLModels.master.TermOfPayment;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class TermOfPaymentManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.TermOfPayment);
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
            var TermFilter = {
                "termOfPayment": {
                    "$regex": regex
                }
            };
            var CodeFilter = {
                "code": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [TermFilter, CodeFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(termOfPayment) {
        termOfPayment.code = termOfPayment.code === "" ? generateCode() : termOfPayment.code;
        termOfPayment._createdDate=new Date();
        return Promise.resolve(termOfPayment);
    }

    _validate(termOfPayment) {
        var errors = {};
        var valid = termOfPayment;
        // 1. begin: Declare promises.
        var getTermOfPaymentPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code
        });

        return Promise.all([getTermOfPaymentPromise])
            .then(results => {
                var _termOfPayment = results[0];

                if (_termOfPayment)
                    errors["code"] = i18n.__("TermOfPayment.code.isExists:%s is exists", i18n.__("TermOfPayment.code._:code"));
                if(!valid.termOfPayment || valid.termOfPayment==""){
                    errors["termOfPayment"] = i18n.__("TermOfPayment.termOfPayment.isExists:%s is exists", i18n.__("TermOfPayment.termOfPayment._:TermOfPayment"));
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new TermOfPayment(termOfPayment);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.TermOfPayment}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.TermOfPayment}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
};
