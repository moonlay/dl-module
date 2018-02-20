"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var StandardHour = DLModels.garmentMasterPlan.StandardHour;
var BaseManager = require("module-toolkit").BaseManager;
var GarmentBuyerManager = require('../master/garment-buyer-manager');
var ComodityManager = require('./master-plan-comodity-manager');
var i18n = require("dl-i18n");
var moment = require('moment');
var generateCode = require("../../utils/code-generator");
var global = require("../../global");

module.exports = class StandardHourManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.StandardHour);
        this.garmentBuyerManager = new GarmentBuyerManager(db, user);
        this.comodityManager = new ComodityManager(db, user);
    }

    _beforeInsert(data) {
        data.code = !data.code || data.code === '' ? generateCode() : data.code;
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
            var buyerFilter = {
                "garmentBuyerName": {
                    "$regex": regex
                }
            };
            var comodityFilter = {
                "masterplanComodityName": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, buyerFilter, comodityFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(standardHour) {
        var errors = {};
        var valid = standardHour;
        var locale = global.config.locale;
        moment.locale(locale.name);
        // 1. begin: Declare promises.
        var getStandarHour = this.collection.where({ 
            "_id": {
                    "$ne": new ObjectId(valid._id)
                },
            "_deleted": false,
            "garmentBuyerId": valid.garmentBuyerId && ObjectId.isValid(valid.garmentBuyerId) ? new ObjectId(valid.garmentBuyerId) : '',
            "comodityId": valid.masterplanComodityId && ObjectId.isValid(valid.masterplanComodityId) ? new ObjectId(valid.masterplanComodityId) : ''
        }).page(1, 2).order({"date" : -1}).execute();
        var getBuyer = valid.garmentBuyerId && ObjectId.isValid(valid.garmentBuyerId) ? this.garmentBuyerManager.getSingleByIdOrDefault(new ObjectId(valid.garmentBuyerId)) : Promise.resolve(null);
        var getComodity = valid.masterplanComodityId && ObjectId.isValid(valid.masterplanComodityId) ? this.comodityManager.getSingleByIdOrDefault(new ObjectId(valid.masterplanComodityId)) : Promise.resolve(null);
        // 2. begin: Validation.
        return Promise.all([getStandarHour, getBuyer, getComodity])
            .then(results => {
                var standardHourArr = results[0];
                var _buyer = results[1];
                var _comodities = results[2];
                
                if(!valid.garmentBuyerId || valid.garmentBuyerId==='')
                    errors["buyer"] = i18n.__("StandardHour.garmentBuyerId.isRequired:%s is required", i18n.__("StandardHour.garmentBuyerId._:Buyer"));
                    
                if(!valid.masterplanComodityId || valid.masterplanComodityId==='')
                    errors["comodity"] = i18n.__("StandardHour.comodityId.isRequired:%s is required", i18n.__("StandardHour.comodityId._:Comodity"));
                
                if(!valid.shCutting || valid.shCutting <= 0)
                    errors["shCutting"] = i18n.__("StandardHour.shCutting.mustBeGreater:%s must be greater than 0", i18n.__("StandardHour.SMVCutting._:SMVCutting"));

                if(!valid.shSewing || valid.shSewing <= 0)
                    errors["shSewing"] = i18n.__("StandardHour.shSewing.mustBeGreater:%s must be greater than 0", i18n.__("StandardHour.SMVSewing._:SMVSewing"));

                if(!valid.shFinishing || valid.shFinishing <= 0)
                    errors["shFinishing"] = i18n.__("StandardHour.shFinishing.mustBeGreater:%s must be greater than 0", i18n.__("StandardHour.SMVFinishing._:SMVFinishing"));

                if(!valid.date || valid.date === '')
                    errors["date"] = i18n.__("StandardHour.date.isRequired:%s is required", i18n.__("StandardHour.date._:Date"));
                else{
                    var date = new Date(valid.date);
                    var dateNow = new Date();
                    // if(date > dateNow)
                    //     errors["date"] = i18n.__(`StandardHour.date.notGreater:%s not greater than today`, i18n.__("StandardHour.date._:Date"));
                    // else if(standardHourArr && standardHourArr.data.length > 0){
                    //     var _standardHour = standardHourArr.data[0]
                    //     if(date <= _standardHour.date){

                    //         var dateHour = moment(new Date(_standardHour.date)).format("DD-MM-YYYY");
                    //         errors["date"] = `Date must be greater than ${dateHour}`;
                    //     }
                    // }
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if(_buyer){
                    valid.garmentBuyerId = new ObjectId(_buyer._id);
                    valid.garmentBuyerName = _buyer.name;
                    valid.garmentBuyerCode = _buyer.code;
                }
                if(_comodities){
                    valid.masterplanComodityId = new ObjectId(_comodities._id);
                    valid.masterplanComodityName = _comodities.name;
                    valid.masterplanComodityCode = _comodities.code;
                }

                valid.date = new Date(valid.date);

                if (!valid.stamp) {
                    valid = new StandardHour(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.finishingPrinting.collection.DailyOperation}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };
        
        var codeIndex = {
            name: `ix_${map.production.finishingPrinting.collection.DailyOperation}_code`,
            key: {
                code: 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    // getStandardHourByStyle(styleCode){
    //     return new Promise((resolve, reject) => {
    //         this.collection.aggregate(
    //             [
    //                 { $match: { "style.code":styleCode } },
    //                 { $sort: { date:-1, _updatedDate:-1 } },
    //                 {
    //                 $group:
    //                     {
    //                     _id: "$style.code",
    //                     firstSHSewing: { $first: "$shSewing" },
    //                     shId: { $first: "$_id" }
    //                     //shId: "$_id"
    //                     }
    //                 }
    //                 //{ $match: { _id:styleCode } }
    //             ]
    //             )
    //             .toArray(function (err, result) {
    //                 resolve(result);
    //             });
    //     });
    // }

    getStandardHourByBuyerComodity(buyerCode, comodityCode){
        return new Promise((resolve, reject) => {
            this.collection.aggregate(
                [
                    { $match: { "masterplanComodityCode":comodityCode , garmentBuyerCode:buyerCode} },
                    { $sort: { date:-1, _updatedDate:-1 } },
                    {
                    $group:
                        {
                        _id:{ "masterplanComodityCode":comodityCode , garmentBuyerCode:buyerCode},
                        firstSHSewing: { $first: "$shSewing" },
                        shId: { $first: "$_id" }
                        //shId: "$_id"
                        }
                    }
                    //{ $match: { _id:styleCode } }
                ]
                )
                .toArray(function (err, result) {
                    resolve(result);
                });
        });
    }
}