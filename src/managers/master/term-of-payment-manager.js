"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var generateCode = require("../../utils/code-generator");
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

    _validate(termOfPayment) {
        var errors = {};
        var valid = termOfPayment;
        // 1. begin: Declare promises.
        var getTermOfPaymentPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            termOfPayment: valid.termOfPayment,
            _deleted: false
        });

        return Promise.all([getTermOfPaymentPromise])
            .then(results => {
                var _termOfPayment = results[0];

                if(!valid.termOfPayment || valid.termOfPayment=="")
                    errors["termOfPayment"] = i18n.__("TermOfPayment.termOfPayment.isRequired:%s is required", i18n.__("TermOfPayment.termOfPayment._:termOfPayment"));
                else if (_termOfPayment)
                    errors["termOfPayment"] = i18n.__("TermOfPayment.termOfPayment.isExists:%s is exists", i18n.__("TermOfPayment.termOfPayment._:termOfPayment"));

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new TermOfPayment(termOfPayment);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _beforeInsert(termOfPayment) {
        termOfPayment.code = termOfPayment.code === "" ? generateCode() : termOfPayment.code;
        return Promise.resolve(termOfPayment);
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
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
};
