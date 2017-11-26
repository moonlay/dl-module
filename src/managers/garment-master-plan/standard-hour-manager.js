"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var StandardHour = DLModels.garmentMasterPlan.StandardHour;
var BaseManager = require("module-toolkit").BaseManager;
var StyleManager = require('./style-manager');
var i18n = require("dl-i18n");
var moment = require('moment');
var generateCode = require("../../utils/code-generator");
var global = require("../../global");

module.exports = class StandardHourManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.StandardHour);
        this.styleManager = new StyleManager(db, user);
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
            var nameFilter = {
                "style.name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, nameFilter];
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
            "styleId": valid.styleId && ObjectId.isValid(valid.styleId) ? new ObjectId(valid.styleId) : ''
        }).page(1, 2).order({"date" : -1}).execute();
        var getStyle = valid.styleId && ObjectId.isValid(valid.styleId) ? this.styleManager.getSingleByIdOrDefault(new ObjectId(valid.styleId)) : Promise.resolve(null);
        // 2. begin: Validation.
        return Promise.all([getStandarHour, getStyle])
            .then(results => {
                var standardHourArr = results[0];
                var _style = results[1];
                
                if(!valid.styleId || valid.styleId==='')
                    errors["style"] = i18n.__("StandardHour.style.isRequired:%s is required", i18n.__("StandardHour.style._:Style"));
                else if(!_style)
                    errors["style"] = i18n.__("StandardHour.style.isNotFound:%s is not found", i18n.__("StandardHour.style._:Style"));
                
                if(!valid.shCutting || valid.shCutting <= 0)
                    errors["shCutting"] = i18n.__("StandardHour.shCutting.mustBeGreater:%s must be greater than 0", i18n.__("StandardHour.shCutting._:ShCutting"));

                if(!valid.shSewing || valid.shSewing <= 0)
                    errors["shSewing"] = i18n.__("StandardHour.shSewing.mustBeGreater:%s must be greater than 0", i18n.__("StandardHour.shSewing._:ShSewing"));

                if(!valid.shFinishing || valid.shFinishing <= 0)
                    errors["shFinishing"] = i18n.__("StandardHour.shFinishing.mustBeGreater:%s must be greater than 0", i18n.__("StandardHour.shFinishing._:ShFinishing"));

                if(!valid.date || valid.date === '')
                    errors["date"] = i18n.__("StandardHour.date.isRequired:%s is required", i18n.__("StandardHour.date._:Date"));
                else{
                    var date = new Date(valid.date);
                    var dateNow = new Date();
                    if(date > dateNow)
                        errors["date"] = i18n.__(`StandardHour.date.notGreater:%s not greater than today`, i18n.__("StandardHour.date._:Date"));
                    else if(standardHourArr && standardHourArr.data.length > 0){
                        var _standardHour = standardHourArr.data[0]
                        if(date <= _standardHour.date){

                            var dateHour = moment(new Date(_standardHour.date)).format("DD-MM-YYYY");
                            errors["date"] = `Date must be greater than ${dateHour}`;
                        }
                    }
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if(_style){
                    valid.styleId = _style._id;
                    valid.style = _style;
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
}