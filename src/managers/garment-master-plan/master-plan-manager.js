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
var MasterPlanComodity = require('./master-plan-comodity-manager');
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
        this.masterPlanComodity = new MasterPlanComodity(db, user);
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
        if(valid.details && valid.details.length > 0){
            for(var detail of valid.details){
                if(detail.detailItems && detail.detailItems.length > 0){
                    for(var item of detail.detailItems){
                        if(item.unitId && ObjectId.isValid(item.unitId))
                            units.push(new ObjectId(item.unitId));
                        if(item.weeklyPlanYear)
                            weeks.push(item.weeklyPlanYear);
                    }
                }
            }
        }
        var getBuyer = valid.garmentBuyerId && ObjectId.isValid(valid.garmentBuyerId) ? this.garmentBuyerManager.getSingleByIdOrDefault(new ObjectId(valid.garmentBuyerId)) : Promise.resolve(null);
        var getBookingOrder = valid.bookingOrderId && ObjectId.isValid(valid.bookingOrderId) ? this.bookingOrderManager.getSingleByIdOrDefault(new ObjectId(valid.bookingOrderId)) : Promise.resolve(null);
        var getUnits = units.length > 0 ? this.unitManager.collection.find({ "_id": { "$in": units } }).toArray() : Promise.resolve([]);
        var getWeeklyPlan = weeks.length > 0 ? this.weeklyPlanManager.collection.find({ "year": { "$in": weeks } }).toArray() : Promise.resolve([]);
        
        // 2. begin: Validation.
        return Promise.all([getMasterPlan,getBuyer,getBookingOrder,getUnits,getWeeklyPlan])
            .then(results => {
                var _masterPlan = results[0];
                var _buyer = results[1];
                var _bookingOrder=results[2];
                var _units=results[3];
                var _weeklyPlan = results[4];


                if(!valid.bookingOrderNo || valid.bookingOrderNo === "")
                    errors["bookingOrderNo"] = i18n.__("MasterPlan.bookingOrderNo.isRequired:%s is required", i18n.__("MasterPlan.bookingOrderNo._:BookingOrderNo"));
                else if (_masterPlan)
                    errors["bookingOrderNo"] = i18n.__("MasterPlan.bookingOrderNo.isExists:%s is already exists in Master Plan", i18n.__("MasterPlan.bookingOrderNo._:BookingOrderNo"));
                else if (!_bookingOrder)
                    errors["bookingOrderNo"] = i18n.__("MasterPlan.bookingOrderNo.isNotExists:%s is not exists", i18n.__("MasterPlan.bookingOrderNo._:BookingOrderNo"));

                var isHaveItem = false;
                if(valid.details){
                    for(var detail of valid.details){
                        if(detail.detailItems && detail.detailItems.length > 0){
                            isHaveItem = true;
                            break;
                        }
                    }
                }
                if(isHaveItem){
                    var detailErrors = [];
                    for(var detail of valid.details){
                        var detailError = {};
                        var itemErrors = [];
                        if(_bookingOrder){
                            var detailBooking = _bookingOrder.items.find(item => item.code === detail.code);
                            if(!detailBooking)
                                detailError["masterPlanComodity"] = i18n.__("MasterPlan.details.masterPlanComodity.isDeleted:%s is deleted from Booking Order by MD", i18n.__("MasterPlan.details.masterPlanComodity._:MasterPlanComodity"));
                        }
                        var totalDetail = 0;
                        if(detail.detailItems && detail.detailItems.length > 0){
                            for(var item of detail.detailItems){
                                var itemError = {};

                                totalDetail += (!item.quantity ? 0 : item.quantity);
                                
                                if(!item.shCutting || item.shCutting === 0)
                                    itemError["shCutting"] = i18n.__("MasterPlan.details.detailItems.shCutting.mustGreater:%s must greater than 0", i18n.__("MasterPlan.details.detailItems.shCutting._:Sh Cutting"));
                                if(!item.shSewing || item.shSewing === 0)
                                    itemError["shSewing"] = i18n.__("MasterPlan.details.detailItems.shSewing.mustGreater:%s must greater than 0", i18n.__("MasterPlan.details.detailItems.shSewing._:Sh Sewing"));
                                if(!item.shFinishing || item.shFinishing === 0)
                                    itemError["shFinishing"] = i18n.__("MasterPlan.details.detailItems.shFinishing.mustGreater:%s must greater than 0", i18n.__("MasterPlan.details.detailItems.shFinishing._:Sh Finishing"));
                                if(!item.quantity || item.quantity === 0)
                                    itemError["quantity"] = i18n.__("MasterPlan.details.detailItems.quantity.mustGreater:%s must greater than 0", i18n.__("MasterPlan.details.detailItems.quantity._:Quantity"));

                                if(!item.unitId || item.unitId === "")
                                    itemError["unit"] = i18n.__("MasterPlan.details.detailItems.unit.isRequired:%s is required", i18n.__("MasterPlan.details.detailItems.unit._:Unit"));
                                else if(!_units || _units.length === 0)
                                    itemError["unit"] = i18n.__("MasterPlan.details.detailItems.unit.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.detailItems.unit._:Unit"));
                                else{
                                    var id = ObjectId.isValid(item.unitId) && typeof(item.unitId) === 'object' ? item.unitId.toString() : item.unitId;
                                    var unitSelected = _units.find(select => select._id.toString() === id);
                                    if(!unitSelected)
                                        itemError["unit"] = i18n.__("MasterPlan.details.detailItems.unit.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.detailItems.unit._:Unit"));
                                }

                                if(!item.weeklyPlanYear || item.weeklyPlanYear === "" || item.weeklyPlanYear === 0 || !item.weeklyPlanId || item.weeklyPlanId === "")
                                    itemError["weeklyPlanYear"] = i18n.__("MasterPlan.details.detailItems.weeklyPlanYear.isRequired:%s is required", i18n.__("MasterPlan.details.detailItems.weeklyPlanYear._:Weekly Plan Year"));
                                else if(!_weeklyPlan || _weeklyPlan.length === 0)
                                    itemError["weeklyPlanYear"] = i18n.__("MasterPlan.details.detailItems.weeklyPlanYear.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.detailItems.weeklyPlanYear._:Weekly Plan Year"));
                                else{
                                    var id = ObjectId.isValid(item.weeklyPlanId) && typeof(item.weeklyPlanId) === 'object' ? item.weeklyPlanId.toString() : item.weeklyPlanId;
                                    var weeklyPlan = _weeklyPlan.find(select => select._id.toString() === id);
                                    if(!weeklyPlan)
                                        itemError["weeklyPlanYear"] = i18n.__("MasterPlan.details.detailItems.weeklyPlanYear.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.detailItems.weeklyPlanYear._:Weekly Plan Year"));
                                    else{
                                        if(!item.week)
                                            itemError["week"] = i18n.__("MasterPlan.details.detailItems.week.isRequired:%s is required", i18n.__("MasterPlan.details.detailItems.week._:Week"));
                                        else {
                                            var weekDay = weeklyPlan.items.find(select => select.weekNumber === item.week.weekNumber && select.month === item.week.month && select.efficiency === item.week.efficiency && select.operator === item.week.operator);
                                            if(!weekDay)
                                                itemError["week"] = i18n.__("MasterPlan.details.detailItems.week.isNotExists:%s is not Exists", i18n.__("MasterPlan.details.detailItems.week._:Week"));
                                        }
                                    }
                                }
                                itemErrors.push(itemError);
                            }
                            for (var error of itemErrors) {
                                if (Object.getOwnPropertyNames(error).length > 0) {
                                    detailError["detailItems"] = itemErrors;
                                    break;
                                }
                            }
                        }
                        if(totalDetail > detail.quantity)
                            detailError["quantity"] = `Quantity can not be more than ${detail.quantity}`;
                        detailErrors.push(detailError);
                    }
                    for (var error of detailErrors) {
                        if (Object.getOwnPropertyNames(error).length > 0) {
                            errors["details"] = detailErrors;
                            break;
                        }
                    }
                } else 
                    errors["detail"] = i18n.__("MasterPlan.detail.mustHaveItem:%s must have 1 item", i18n.__("MasterPlan.detail._:Detail"));
                
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
                    var details = [];
                    for(var detail of valid.details){
                        var items = [];
                        var itemBooking = _bookingOrder.items.find(select => select.code === detail.code);
                        if(itemBooking){
                            detail.masterPlanComodityId = itemBooking.masterPlanComodityId;
                            detail.masterPlanComodity = itemBooking.masterPlanComodity;
                            detail.quantity = itemBooking.quantity;
                            detail.remark = itemBooking.remark;
                            detail.isConfirmed = itemBooking.isConfirmed;
                        }
                        if(detail.detailItems.length > 0){
                            for(var item of detail.detailItems){
                                var unitSelected = _units.find(select => select._id.toString() === item.unitId);
                                if(unitSelected){
                                    item.unitId = unitSelected._id;
                                    item.unit = unitSelected;
                                }
                                var weeklyPlan = _weeklyPlan.find(select => select._id.toString() === item.weeklyPlanId);
                                if(weeklyPlan){
                                    item.weeklyPlanId = weeklyPlan._id;
                                    item.weeklyPlanYear = weeklyPlan.year;
                                    var weekDay = weeklyPlan.items.find(select => select.weekNumber === item.week.weekNumber && select.month === item.week.month && select.efficiency === item.week.efficiency && select.operator === item.week.operator);
                                    if(weekDay)
                                        item.week = weekDay;
                                }
                                if (!item.stamp) {
                                    item = new MasterPlanDetailItem(item);
                                }
                                item._createdDate = valid._createdDate;
                                item.stamp(this.user.username, "manager");
                                items.push(item);
                            }
                        }
                        detail.detailItems = items;
                        if (!detail.stamp) {
                            detail = new MasterPlanDetail(detail);
                        }
                        detail._createdDate = valid._createdDate;
                        detail.stamp(this.user.username, "manager");
                        details.push(detail);
                    }
                    valid.details = details;
                }
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