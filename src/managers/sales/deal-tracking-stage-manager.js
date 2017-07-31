"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');
var DLModels = require("dl-models");
var map = DLModels.map;
var generateCode = require("../../utils/code-generator");
var DealTrackingStage = DLModels.sales.DealTrackingStage;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class DealTrackingStageManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.sales.collection.DealTrackingStage);
        this.dealTrackingDealCollection = this.db.use(map.sales.collection.DealTrackingDeal);
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
            keywordFilter["$or"] = [nameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _validate(dealTrackingStage) {
        var errors = {};
        var valid = dealTrackingStage;
        
        if (!valid.name || valid.name == "")
            errors["name"] = i18n.__("DealTrackingStage.name.isRequired:%s is required", i18n.__("DealTrackingStage.name._:Name")); //"Nama stage harus diisi";
        
        if (Object.getOwnPropertyNames(errors).length > 0) {
            var ValidationError = require('module-toolkit').ValidationError;
            return Promise.reject(new ValidationError('data does not pass validation', errors));
        }
        
        if (!valid.stamp) {
            valid = new DealTrackingStage(valid);
        }
        
        valid.stamp(this.user.username, "manager");
        return Promise.resolve(valid);
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.sales.collection.DealTrackingStage}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var boardIdIndex = {
            name: `ix_${map.sales.collection.DealTrackingStage}_boardId`,
            key: {
                boardId: -1
            }
        };

        var deletedIndex = {
            name: `ix_${map.sales.collection.DealTrackingStage}__deleted`,
            key: {
                _deleted: 1
            }
        };

        return this.collection.createIndexes([dateIndex, deletedIndex, boardIdIndex]);
    }

    read(paging) {
        var _paging = {
            filter: { boardId: new ObjectId(paging._id) },
            select: ["code", "name", "deals"]
        };

        if (paging.filter && Object.getOwnPropertyNames(paging.filter).length > 0) {
            _paging.filter = paging.filter;
        }

        return this._createIndexes()
            .then((createIndexResults) => {
                var query = this._getQuery(_paging);
                return this.collection
                    .where(query)
                    .select(_paging.select)
                    .execute()
                    .then((result) => {
                        var promises = result.data.map((data) => {
                            var deals = data.deals;

                            data.deals = deals.map((deal) => {
                                deal = ObjectId.isValid(deal) ? new ObjectId(deal) : null;
                                return deal;
                            });

                            var _filter = {
                                filter: { _id: { "$in": data.deals } },
                                select: ["code", "name", "amount", "closeDate", "contact.firstName", "contact.lastName"]
                            };

                            query = this._getQuery(_filter);

                            return this.dealTrackingDealCollection
                                .where(query)
                                .select(_filter.select)
                                .execute()
                                .then((res) => {
                                    res.data.sort(function(a, b) {
                                        return deals.indexOf(a._id.toString()) - deals.indexOf(b._id.toString());
                                    });

                                    data.deals = res.data;
                                    return data;
                                })
                        });                        

                        return Promise.all(promises)
                            .then((res) => {
                                result.data = res;
                                return Promise.resolve(result);
                            })
                    });
            });
    }

    update(data) {
        if(data.type == "Activity") {
            var now = new Date();
            var ticks = ((now.getTime() * 10000) + 621355968000000000);

            var updateData = {
                'deals': data.deals,
                '_stamp': ticks.toString(16),
                '_updatedBy': this.user.username,
                '_updatedDate': now,
                '_updateAgent': 'manager'
            };
            
            return this.collection.findOneAndUpdate({_id: new ObjectId(data._id)}, {$set: updateData});
        }
        else {
            return this._pre(data)
                .then((validData) => {
                    return this._beforeUpdate(validData);
                })
                .then((processedData) => {
                    return this.collection.update(processedData);
                })
                .then((id) => {
                    return this._afterUpdate(id);
                }); 
        }
    }
};