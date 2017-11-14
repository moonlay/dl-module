"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var Style = DLModels.garmentMasterPlan.Style;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class StyleManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.Style);
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
            var descriptionFilter = {
                "name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, nameFilter, descriptionFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(style) {
        var errors = {};
        var valid = style;
        // 1. begin: Declare promises.
        var getStyle = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code,
            _deleted: false
        });
        
        // 2. begin: Validation.
        return Promise.all([getStyle])
            .then(results => {
                var duplicateStyle = results[0];

                if(!valid.code || valid.code === "")
                    errors["code"] = i18n.__("Style.code.isRequired:%s is required", i18n.__("Style.code._:Code"));
                if (duplicateStyle) {
                    errors["code"] = i18n.__("Style.code.isExists:%s is already exists", i18n.__("Style.code._:Code"));
                }

                if(!valid.name || valid.name === "")
                    errors["name"] = i18n.__("Style.name.isRequired:%s is required", i18n.__("Style.name._:Name"));

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if (!valid.stamp) {
                    valid = new Style(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentMasterPlan.collection.Style}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.garmentMasterPlan.collection.Style}_code`,
            key: {
                "code": 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}