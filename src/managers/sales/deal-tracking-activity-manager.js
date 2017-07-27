"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');
var DLModels = require("dl-models");
var map = DLModels.map;
var generateCode = require("../../utils/code-generator");
var DealTrackingActivity = DLModels.sales.DealTrackingActivity;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class DealTrackingActivityManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.sales.collection.DealTrackingActivity);
        this.dealTrackingStageCollection = this.db.use(map.sales.collection.DealTrackingStage);
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
            keywordFilter["$or"] = [codeFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _validate(dealTrackingActivity) {
        var errors = {};
        var valid = dealTrackingActivity;

        if (!valid.type || valid.type === '' || !["ADD", "NOTES", "TASK", "MOVE"].find(r => r === valid.type))
            errors["type"] = i18n.__("DealTrackingActivity.type.invalid:%s is invalid", i18n.__("DealTrackingActivity.type._:Type"));
        else if (valid.type == "NOTES") {
            if (!valid.field.notes || valid.field.notes === '')
                errors["notes"] = i18n.__("DealTrackingActivity.notes.isRequired:%s is required", i18n.__("DealTrackingActivity.notes._:Notes"));
        }
        else if (valid.type == "TASK") {
            if (!valid.field.title || valid.field.title === '')
                errors["title"] = i18n.__("DealTrackingActivity.title.isRequired:%s is required", i18n.__("DealTrackingActivity.title._:Title"));

            if (!valid.field.notes || valid.field.notes === '')
                errors["notes"] = i18n.__("DealTrackingActivity.notes.isRequired:%s is required", i18n.__("DealTrackingActivity.notes._:Notes"));

            if (!valid.field.assignedTo || valid.field.assignedTo === '')
                errors["assignedTo"] = i18n.__("DealTrackingActivity.assignedTo.isRequired:%s is required", i18n.__("DealTrackingActivity.assignedTo._:Assigned To"));

            if (!valid.field.dueDate || valid.field.dueDate === '')
                errors["dueDate"] = i18n.__("DealTrackingActivity.dueDate.isRequired:%s is required", i18n.__("DealTrackingActivity.dueDate._:Due Date"));
        }

        if (Object.getOwnPropertyNames(errors).length > 0) {
            var ValidationError = require('module-toolkit').ValidationError;
            return Promise.reject(new ValidationError('data does not pass validation', errors));
        }

        if (!valid.stamp) {
            valid = new DealTrackingActivity(valid);
        }

        valid.stamp(this.user.username, "manager");
        return Promise.resolve(valid);
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.sales.collection.DealTrackingActivity}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var deletedIndex = {
            name: `ix_${map.sales.collection.DealTrackingActivity}__deleted`,
            key: {
                _deleted: 1
            }
        };

        return this.collection.createIndexes([dateIndex, deletedIndex]);
    }

    read(paging) {
        var _paging = {
            filter: { dealId: new ObjectId(paging._id) },
            select: ["_createdDate", "_createdBy", "code", "type", "field.status", "field.title", "field.notes", "field.assignedTo", "field.dueDate", "field.sourceStageId", "field.targetStageId", "field.attachments"],
            page: paging.page ? paging.page : 1,
            size: paging.size ? paging.size : 20,
            order: paging.order ? paging.order : {}
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
                    .page(_paging.page, _paging.size)
                    .order(_paging.order)
                    .execute()
                    .then((result) => {
                        result.username = this.user.username;

                        var _filter = {
                            filter: { boardId: new ObjectId(paging.boardId) },
                            select: ["name"]
                        };

                        query = this._getQuery(_filter);
                        return this.dealTrackingStageCollection
                            .where(query)
                            .select(_filter.select)
                            .execute()
                            .then((res) => {
                                var activity = result.data.map((data) => {
                                    if (data.type == "MOVE") {
                                        for (var stage of res.data) {
                                            if (stage._id.toString() == data.field.sourceStageId) {
                                                data.field.from = stage.name;
                                            }

                                            if (stage._id.toString() == data.field.targetStageId) {
                                                data.field.to = stage.name;
                                            }
                                        }
                                    }

                                    return data;
                                });

                                result.data = activity;

                                return Promise.resolve(result);
                            });
                    })
            });
    }

    update(data) {
        if (data.type == "Update Task Status") {
            var now = new Date();
            var ticks = ((now.getTime() * 10000) + 621355968000000000);

            var updateData = {
                'field.status': data.status,
                '_stamp': ticks.toString(16),
                '_updatedBy': this.user.username,
                '_updatedDate': now,
                '_updateAgent': 'manager'
            };

            return this.collection.findOneAndUpdate({ _id: new ObjectId(data._id) }, { $set: updateData });
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

    updateActivityAttachment(data) {
        var now = new Date();
        var ticks = ((now.getTime() * 10000) + 621355968000000000);

        var updateData = {
            'field.attachments': data.attachments,
            '_stamp': ticks.toString(16),
            '_updatedBy': this.user.username,
            '_updatedDate': now,
            '_updateAgent': 'manager'
        };

        return this.collection.findOneAndUpdate({ _id: new ObjectId(data._id) }, { $set: updateData });
    }
};