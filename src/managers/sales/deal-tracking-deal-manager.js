"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');
var DLModels = require("dl-models");
var map = DLModels.map;
var CompanyManager = require('../master/company-manager');
var ContactManager = require('../master/contact-manager');
var DealTrackingStageManager = require('./deal-tracking-stage-manager');
var DealTrackingActivityManager = require('./deal-tracking-activity-manager');
var generateCode = require("../../utils/code-generator");
var DealTrackingDeal = DLModels.sales.DealTrackingDeal;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class DealTrackingDealManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.sales.collection.DealTrackingDeal);
        this.companyManager = new CompanyManager(db, user);
        this.contactManager = new ContactManager(db, user);
        this.dealTrackingStageManager = new DealTrackingStageManager(db, user);
        this.dealTrackingActivityManager = new DealTrackingActivityManager(db, user);
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

    _afterInsert(id) {
        return this.dealTrackingStageManager.getSingleById(this.stageId, ["deals"])
            .then((result) => {
                result.deals.push(id.toString());
                result.type = "Activity";

                return this.dealTrackingStageManager.update(result)
                    .then(() => {
                        var activityData = {
                            dealId: id,
                            type: "ADD"
                        };

                        return this.dealTrackingActivityManager.create(activityData)
                            .then(() => {
                                return Promise.resolve(id);
                            })
                    });
            });
    }

    _validate(dealTrackingDeal) {
        var errors = {};
        var valid = dealTrackingDeal;
        
        var getCompany = valid.company && ObjectId.isValid(valid.company._id) ? this.companyManager.getSingleByIdOrDefault(valid.company._id) : Promise.resolve(null);
        var getContact = valid.contact && ObjectId.isValid(valid.contact._id) ? this.contactManager.getSingleByIdOrDefault(valid.contact._id) : Promise.resolve(null);

        return Promise.all([getCompany, getContact])
            .then(results => {
                var _company = results[0];
                var _contact = results[1];
                
                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("DealTrackingDeal.name.isRequired:%s is required", i18n.__("DealTrackingDeal.name._:Name")); //"Nama deal harus diisi";
                
                if (!valid.company)
                    errors["company"] = i18n.__("DealTrackingDeal.company.isRequired:%s is required", i18n.__("DealTrackingDeal.company._:Company")); //"Perusahaan harus diisi";
                else if (!_company)
                    errors["company"] = i18n.__("DealTrackingDeal.company.notFound:%s not found", i18n.__("DealTrackingDeal.company._:Company")); //"Perusahaan tidak ditemukan";
                
                if (!valid.contact)
                    errors["contact"] = i18n.__("DealTrackingDeal.contact.isRequired:%s is required", i18n.__("DealTrackingDeal.contact._:Contact")); //"Kontak harus diisi";
                else if (!_contact)
                    errors["contact"] = i18n.__("DealTrackingDeal.contact.notFound:%s not found", i18n.__("DealTrackingDeal.contact._:Contact")); //"Kontak tidak ditemukan";
                
                if (!valid.closeDate || valid.closeDate == "")
                    errors["closeDate"] = i18n.__("DealTrackingDeal.closeDate.isRequired:%s is required", i18n.__("DealTrackingDeal.closeDate._:Close Date")); //"Tanggal tutup harus diisi";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid.companyId = new ObjectId(valid.company._id);
                valid.contactId = new ObjectId(valid.contact._id);
                this.stageId = valid.stageId;

                if (!valid.stamp) {
                    valid = new DealTrackingDeal(valid);
                }
               
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.sales.collection.DealTrackingDeal}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var deletedIndex = {
            name: `ix_${map.sales.collection.DealTrackingDeal}__deleted`,
            key: {
                _deleted: 1
            }
        };

        return this.collection.createIndexes([dateIndex, deletedIndex]);
    }
};