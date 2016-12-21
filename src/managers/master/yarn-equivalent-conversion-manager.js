'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var YarnEquivalentConversion = DLModels.master.YarnEquivalentConversion;
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class YarnEquivalentConversionManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.YarnEquivalentConversion);
    }

    _getQuery(paging) {
        var deleted = {
            _deleted: false
        };
        var query = paging.keyword ? {
            '$and': [deleted]
        } : deleted;

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var filterNe = {
                'ne': {
                    '$regex': regex
                }
            };
            var filterRatio = {
                'conversionRatio': {
                    '$regex': regex
                }
            };

            var $or = {
                '$or': [filterNe, filterRatio]
            };

            query['$and'].push($or);
        }
        return query;
    }

    _validate(yarnEquivalentConversion) {
        var errors = {};
        var valid = yarnEquivalentConversion;
        // 1. begin: Declare promises.
        var getYarnEquivalentConversionPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            ne: valid.ne
        });
        
        // 2. begin: Validation.
        return Promise.all([getYarnEquivalentConversionPromise])
            .then(results => {
                var _yarnEquivalentConversion = results[0];

                if (!valid.ne || valid.ne == 0)
                    errors["ne"] = i18n.__("YarnEquivalentConversion.ne.isRequired:%s is required", i18n.__("YarnEquivalentConversion.ne._:Ne"));
                else if (_yarnEquivalentConversion)
                    errors["ne"] = i18n.__("YarnEquivalentConversion.ne.isExists:%s is exists", i18n.__("Vat.ne._:Ne"));

                if (!valid.conversionRatio || valid.conversionRatio == 0)
                    errors["conversionRatio"] = i18n.__("YarnEquivalentConversion.conversionRatio.isRequired:%s is required", i18n.__("YarnEquivalentConversion.conversionRatio._:Conversion Ratio"));


                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new YarnEquivalentConversion(yarnEquivalentConversion);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }
    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.YarnEquivalentConversion}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var neRatioIndex = {
            name: `ix_${map.master.collection.YarnEquivalentConversion}_ne_conversionRatio`,
            key: {
                ne: 1,
                conversionRatio: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, neRatioIndex]);
    }

    _getByNe(ne) {
        var query = {
            ne: ne,
            _deleted: false
        };
        return this.getSingleByQueryOrDefault(query);
    }
};
