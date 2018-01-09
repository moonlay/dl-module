"use strict"

require("should");
var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var MasterPlan = DLModels.garmentMasterPlan.MasterPlan;
var MasterPlanDetail = DLModels.garmentMasterPlan.MasterPlanDetail;
var MasterPlanDetailItem = DLModels.garmentMasterPlan.MasterPlanDetailItem;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var WeeklyPlanManager = require('./weekly-plan-manager');
var GarmentBuyerManager = require('../master/garment-buyer-manager');
var BookingOrderManager = require('./booking-order-manager');
var MasterPlanComodityManager = require('./master-plan-comodity-manager');
var UnitManager = require('../master/unit-manager');
var generateCode = require("../../utils/code-generator");

module.exports = class MasterPlanManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.MasterPlan);
        this.weeklyPlanManager = new WeeklyPlanManager(db, user);
        this.garmentBuyerManager = new GarmentBuyerManager(db, user);
        this.unitManager = new UnitManager(db, user);
        this.bookingOrderManager = new BookingOrderManager(db, user);
        this.masterPlanComodityManager = new MasterPlanComodityManager(db, user);
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
                "bookingOrderNo": {
                    "$regex": regex
                }
            };
            var buyerFilter = {
                "garmentBuyerName": {
                    "$regex": regex
                }
            };
            var statusFilter = {
                "status": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, buyerFilter, statusFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(masterPlan){
        masterPlan.code = !masterPlan.code ? generateCode() : masterPlan.code;
        masterPlan._active = true;
        masterPlan._createdDate= new Date();
        return Promise.resolve(masterPlan);
    }

    _validate(masterPlan) {
        var errors = {};
        var valid = masterPlan;
        // 1. begin: Declare promises.
        
        var getMasterPlan = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            bookingOrderNo: valid.bookingOrderNo ? valid.bookingOrderNo : "",
            _deleted: false
        });
        var units = [];
        var weeks = [];
        var comodities = [];
        if(valid.details && valid.details.length > 0){
            for(var detail of valid.details){
                if(detail.unitId && ObjectId.isValid(detail.unitId))
                    units.push(new ObjectId(detail.unitId));
                if(detail.weeklyPlanYear)
                    weeks.push(detail.weeklyPlanYear);
                if(detail.masterPlanComodityId && ObjectId.isValid(detail.masterPlanComodityId))
                    comodities.push(new ObjectId(detail.masterPlanComodityId));
            }
        }
        var getBuyer = valid.garmentBuyerId && ObjectId.isValid(valid.garmentBuyerId) ? this.garmentBuyerManager.getSingleByIdOrDefault(new ObjectId(valid.garmentBuyerId)) : Promise.resolve(null);
        var getBookingOrder = valid.bookingOrderId && ObjectId.isValid(valid.bookingOrderId) ? this.bookingOrderManager.getSingleByIdOrDefault(new ObjectId(valid.bookingOrderId)) : Promise.resolve(null);
        var getUnits = units.length > 0 ? this.unitManager.collection.find({ "_id": { "$in": units } }).toArray() : Promise.resolve([]);
        var getWeeklyPlan = weeks.length > 0 ? this.weeklyPlanManager.collection.find({ "year": { "$in": weeks } }).toArray() : Promise.resolve([]);
        var getComodity = comodities.length > 0 ? this.masterPlanComodityManager.collection.find({ "_id": { "$in": comodities } }).toArray() : Promise.resolve([]);

        // 2. begin: Validation.
        return Promise.all([getMasterPlan,getBuyer,getBookingOrder,getUnits,getWeeklyPlan, getComodity])
            .then(results => {
                var _masterPlan = results[0];
                var _buyer = results[1];
                var _bookingOrder=results[2];
                var _units=results[3];
                var _weeklyPlan = results[4];
                var _comodities = results[5];

                if(!valid.bookingOrderNo || valid.bookingOrderNo === "")
                    errors["bookingOrderNo"] = i18n.__("MasterPlan.bookingOrderNo.isRequired:%s is required", i18n.__("MasterPlan.bookingOrderNo._:BookingOrderNo"));
                else if (_masterPlan)
                    errors["bookingOrderNo"] = i18n.__("MasterPlan.bookingOrderNo.isExists:%s is already exists in Master Plan", i18n.__("MasterPlan.bookingOrderNo._:BookingOrderNo"));
                else if (!_bookingOrder)
                    errors["bookingOrderNo"] = i18n.__("MasterPlan.bookingOrderNo.isNotExists:%s is not exists", i18n.__("MasterPlan.bookingOrderNo._:BookingOrderNo"));

                if(!valid.details || valid.details.length === 0)
                    errors["detail"] = "detail must have 1 item";
                else{
                    var detailErrors = [];
                    var totalDetail = 0;
                    for(var detail of valid.details){
                        var detailError = {};
                        totalDetail += (!detail.quantity ? 0 : detail.quantity);
                        if(!detail.shCutting || detail.shCutting === 0)
                            detailError["shCutting"] = i18n.__("MasterPlan.details.shCutting.mustGreater:%s must greater than 0", i18n.__("MasterPlan.details.shCutting._:Sh Cutting"));
                        if(!detail.shSewing || detail.shSewing === 0)
                            detailError["shSewing"] = i18n.__("MasterPlan.details.shSewing.mustGreater:%s must greater than 0", i18n.__("MasterPlan.details.shSewing._:Sh Sewing"));
                        if(!detail.shFinishing || detail.shFinishing === 0)
                            detailError["shFinishing"] = i18n.__("MasterPlan.details.shFinishing.mustGreater:%s must greater than 0", i18n.__("MasterPlan.details.shFinishing._:Sh Finishing"));
                        if(!detail.quantity || detail.quantity === 0)
                            detailError["quantity"] = i18n.__("MasterPlan.details.quantity.mustGreater:%s must greater than 0", i18n.__("MasterPlan.details.quantity._:Quantity"));
                        
                        if((detail.isConfirmed && !detail.masterPlanComodityId) || (detail.isConfirmed && detail.masterPlanComodityId === "") )
                            detailError["masterPlanComodity"] = i18n.__("MasterPlan.details.masterPlanComodity.isRequired:%s is required", i18n.__("MasterPlan.details.masterPlanComodity._:Master Plan Comodity"));
                        else if(detail.masterPlanComodityId){
                            var id = ObjectId.isValid(detail.masterPlanComodityId) && typeof(detail.masterPlanComodityId) === 'object' ? detail.masterPlanComodityId.toString() : detail.masterPlanComodityId;
                            var comoditySelected = _comodities.find(select => select._id.toString() === id);
                            if(!comoditySelected)
                                detailError["masterPlanComodity"] = i18n.__("MasterPlan.details.masterPlanComodity.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.masterPlanComodity._:Master Plan Comodity"));
                        }

                        
                        if(!detail.deliveryDate || detail.deliveryDate === '')
                            detailError["deliveryDate"] = i18n.__("MasterPlan.details.deliveryDate.isRequired:%s is required", i18n.__("MasterPlan.details.deliveryDate._:DeliveryDate"));
                        else{
                            _bookingOrder.bookingDate=new Date(_bookingOrder.bookingDate);
                            detail.deliveryDate=new Date (detail.deliveryDate);
                            if(detail.deliveryDate<_bookingOrder.bookingDate){
                                detailError["deliveryDate"] = i18n.__("MasterPlan.details.deliveryDate.shouldNot:%s should not be less than booking order date", i18n.__("MasterPlan.details.deliveryDate._:DeliveryDate"));
                            }
                        }
                        if(!detail.unitId || detail.unitId === "")
                            detailError["unit"] = i18n.__("MasterPlan.details.unit.isRequired:%s is required", i18n.__("MasterPlan.details.unit._:Unit"));
                        else if(!_units || _units.length === 0)
                            detailError["unit"] = i18n.__("MasterPlan.details.unit.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.unit._:Unit"));
                        else{
                            var id = ObjectId.isValid(detail.unitId) && typeof(detail.unitId) === 'object' ? detail.unitId.toString() : detail.unitId;
                            var unitSelected = _units.find(select => select._id.toString() === id);
                            if(!unitSelected)
                                detailError["unit"] = i18n.__("MasterPlan.details.unit.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.unit._:Unit"));
                        }

                        if(!detail.weeklyPlanYear || detail.weeklyPlanYear === "" || detail.weeklyPlanYear === 0 || !detail.weeklyPlanId || detail.weeklyPlanId === "")
                            detailError["weeklyPlanYear"] = i18n.__("MasterPlan.details.weeklyPlanYear.isRequired:%s is required", i18n.__("MasterPlan.details.weeklyPlanYear._:Weekly Plan Year"));
                        else if(!_weeklyPlan || _weeklyPlan.length === 0)
                            detailError["weeklyPlanYear"] = i18n.__("MasterPlan.details.weeklyPlanYear.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.weeklyPlanYear._:Weekly Plan Year"));
                        else{
                            var id = ObjectId.isValid(detail.weeklyPlanId) && typeof(detail.weeklyPlanId) === 'object' ? detail.weeklyPlanId.toString() : detail.weeklyPlanId;
                            var weeklyPlan = _weeklyPlan.find(select => select._id.toString() === id);
                            if(!weeklyPlan)
                                detailError["weeklyPlanYear"] = i18n.__("MasterPlan.details.weeklyPlanYear.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.weeklyPlanYear._:Weekly Plan Year"));
                            else{
                                if(!detail.week)
                                    detailError["week"] = i18n.__("MasterPlan.details.week.isRequired:%s is required", i18n.__("MasterPlan.details.week._:Week"));
                                else{ 
                                    var weekDay = weeklyPlan.items.find(select => select.weekNumber === detail.week.weekNumber && select.month === detail.week.month && select.efficiency === detail.week.efficiency && select.operator === detail.week.operator);
                                    if(!weekDay)
                                        detailError["week"] = i18n.__("MasterPlan.details.week.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.week._:Week"));
                                }
                            }
                        }
                        detailErrors.push(detailError);
                    }
                    for (var error of detailErrors) {
                        if (Object.getOwnPropertyNames(error).length > 0) {
                            errors["details"] = detailErrors;
                            break;
                        }
                    }
                    if(totalDetail > valid.quantity)
                        errors["detail"] = `Quantity can not be more than ${valid.quantity}`;
                }
              
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                
                if(_bookingOrder){
                    valid.bookingOrderId = _bookingOrder._id;
                    valid.bookingOrderNo = _bookingOrder.code;
                    valid.bookingDate = _bookingOrder.bookingDate;
                    valid.deliveryDate = _bookingOrder.deliveryDate;
                    valid.quantity = _bookingOrder.orderQuantity;
                    valid.remark = _bookingOrder.remark;
                    valid.bookingItems = _bookingOrder.items;
                }
                var details =[];
                for(var detail of valid.details){
                    detail.code = !detail.code ? generateCode() : detail.code;
                    var unitId = ObjectId.isValid(detail.unitId) && typeof(detail.unitId) === 'object' ? detail.unitId.toString() : detail.unitId;
                    var unitSelected = _units.find(select => select._id.toString() === unitId);
                    if(unitSelected){
                        detail.unitId = unitSelected._id;
                        detail.unit = unitSelected;
                    }
                    var weeklyPlanId = ObjectId.isValid(detail.weeklyPlanId) && typeof(detail.weeklyPlanId) === 'object' ? detail.weeklyPlanId.toString() : detail.weeklyPlanId;
                    var weeklyPlan = _weeklyPlan.find(select => select._id.toString() === weeklyPlanId);
                    if(weeklyPlan){
                        detail.weeklyPlanId = weeklyPlan._id;
                        detail.weeklyPlanYear = weeklyPlan.year;
                        var weekDay = weeklyPlan.items.find(select => select.weekNumber === detail.week.weekNumber && select.month === detail.week.month && select.efficiency === detail.week.efficiency && select.operator === detail.week.operator);
                        if(weekDay)
                            detail.week = weekDay;
                    }
                    if(detail.masterPlanComodityId){
                        var masterPlanComodityId = ObjectId.isValid(detail.masterPlanComodityId) && typeof(detail.masterPlanComodityId) === 'object' ? detail.masterPlanComodityId.toString() : detail.masterPlanComodityId;
                        var masterPlanComodity = _comodities.find(select => select._id.toString() === masterPlanComodityId);
                        if(masterPlanComodity){
                            detail.masterPlanComodityId = masterPlanComodity._id;
                            detail.masterPlanComodity = masterPlanComodity;
                        }
                    }else{
                        detail.masterPlanComodityId = null;
                        detail.masterPlanComodity = null;
                    }
                    detail.deliveryDate = new Date(detail.deliveryDate);
                    if (!detail.stamp) {
                        detail = new MasterPlanDetail(detail);
                    }
                    detail._createdDate = valid._createdDate;
                    detail.stamp(this.user.username, "manager");
                    details.push(detail);
                }
                valid.details = details;
                if(_buyer){
                    valid.garmentBuyerId = _buyer._id;
                    valid.garmentBuyerName = _buyer.name;
                    valid.garmentBuyerCode = _buyer.code;
                }

                if(!valid.hasOwnProperty('status'))
                    valid["status"] = "Booking";
                if (!valid.stamp) {
                    valid = new MasterPlan(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }
    
    _afterInsert(id) {
        return new Promise((resolve, reject) => {
            this.getSingleById(id)
                .then(data => {
                    this.bookingOrderManager.getSingleById(data.bookingOrderId)
                        .then(booking =>{
                            booking.isMasterPlan = true;
                            this.bookingOrderManager.collection.update(booking)
                                .then(idBooking=>{
                                    resolve(id);
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    delete(data) {
        return new Promise((resolve, reject) => {
            data._deleted = true;
            this.bookingOrderManager.getSingleById(data.bookingOrderId)
                .then(booking =>{
                    booking.isMasterPlan = false;
                    this.bookingOrderManager.collection.update(booking)
                        .then(idBooking=>{
                            this.collection.update(data)
                                .then(id => resolve(id))
                                .catch(e => {
                                    reject(e);
                                });
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getPreview(month, year){
        return new Promise((resolve, reject) => {
            var deletedQuery = {
                _deleted: false
            };
            var stringDate = month > 10 ? `${year}-${month - 1}-01` : `${year}-0${month - 1}-01`;
            var thisDate = new Date(stringDate);
            var nextDate = new Date(thisDate.setMonth(thisDate.getMonth() + 6));
            var nextMonth = nextDate.getMonth();
            var nextYear = nextDate.getFullYear();
            var dateQuery = {
                "$and" : [
                    {"details.week.month" : {"$gte" : (month - 1)}},
                    {"details.weeklyPlanYear" : {"$gte" : year}},
                    {"details.week.month" : {"$lte" : nextMonth}},
                    {"details.weeklyPlanYear" : {"$lte" : nextYear}}
                ]
            };
            this.collection
            .aggregate([
                { "$unwind": "$details" },
                { "$match": dateQuery }, 
                {
                    "$project": {
                        "month": "$details.week.month",
                        "week": "$details.week.weekNumber",
                        "year": "$details.weeklyPlanYear",
                        "unitCode": "$details.unit.code",
                        "sh":"$details.shSewing"
                    }
                },
                {
                    "$group": {
                        "_id": { "month": "$month", "week": "$week", "year": "$year", "unitCode": "$unitCode" },
                        "sh": { "$sum": "$sh" }
                    }
                }

            ])
            .toArray()
            .then(results => {
                resolve(results);
            })
            .catch(e => {
                reject(e);
            });
        });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentMasterPlan.collection.MasterPlan}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.garmentMasterPlan.collection.MasterPlan}_code`,
            key: {
                "code": 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}