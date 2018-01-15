"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var BookingOrder = DLModels.garmentMasterPlan.BookingOrder;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var StyleManager = require('./style-manager');
var StandardHourManager = require('./standard-hour-manager');
var WeeklyPlanManager = require('./weekly-plan-manager');
var GarmentBuyerManager = require('../master/garment-buyer-manager');
var UnitManager = require('../master/unit-manager');
var generateCode = require("../../utils/code-generator");

module.exports = class BookingOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.BookingOrder);
        this.styleManager = new StyleManager(db, user);
        this.standardHourManager = new StandardHourManager(db, user);
        this.weeklyPlanManager = new WeeklyPlanManager(db, user);
        this.garmentBuyerManager = new GarmentBuyerManager(db, user);
        this.unitManager = new UnitManager(db, user);
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
            var styleFilter = {
                "style.name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, buyerFilter, styleFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(bookingOrder){
        bookingOrder.code = !bookingOrder.code ? generateCode() : bookingOrder.code;
        bookingOrder._active = true;
        bookingOrder._createdDate= new Date();
        return Promise.resolve(bookingOrder);
    }

    _validate(bookingOrder) {
        var errors = {};
        bookingOrder.code = !bookingOrder.code ? generateCode() : bookingOrder.code;
        var valid = bookingOrder;
        // 1. begin: Declare promises.
        
        var getBooking = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code,
            _deleted: false
        });

        var getStyle = valid.styleId && ObjectId.isValid(valid.styleId) ? this.styleManager.getSingleByIdOrDefault(new ObjectId(valid.styleId)) : Promise.resolve(null);
        var getBuyer = valid.garmentBuyerId && ObjectId.isValid(valid.garmentBuyerId) ? this.garmentBuyerManager.getSingleByIdOrDefault(new ObjectId(valid.garmentBuyerId)) : Promise.resolve(null);
        var getSH = valid.standardHourId && ObjectId.isValid(valid.standardHourId) ? this.standardHourManager.getSingleByIdOrDefault(new ObjectId(valid.standardHourId)) : Promise.resolve(null);

        valid.details = valid.details || [];
        var getWeeklyPlan = [];
        var getUnit = [];
        for (var detail of valid.details) {
            if(!detail.weeklyPlanId)
                detail.weeklyPlanId=detail.weeklyPlan && ObjectId.isValid(detail.weeklyPlan._id) ? detail.weeklyPlan._id : "";
            var week =detail.weeklyPlan && ObjectId.isValid(detail.weeklyPlanId) ? this.weeklyPlanManager.getSingleByIdOrDefault(detail.weeklyPlanId) : Promise.resolve(null);
            getWeeklyPlan.push(week);
            if(!detail.unitId)
                detail.unitId=detail.unit && ObjectId.isValid(detail.unit._id) ? detail.unit._id : "";
            var unit = detail.unit && ObjectId.isValid(detail.unitId) ? this.unitManager.getSingleByIdOrDefault(detail.unitId) : Promise.resolve(null);
            getUnit.push(unit);
        }
        // 2. begin: Validation.
        return Promise.all([getBooking,getStyle,getBuyer,getSH].concat(getWeeklyPlan, getUnit))
            .then(results => {
                var duplicateBooking = results[0];
                var _style=results[1];
                var _buyer=results[2];
                var _sh=results[3];
                var _week = results.slice(4, 4 + getWeeklyPlan.length);
                var _unit = results.slice(4 + getWeeklyPlan.length, results.length);


                if(!valid.code || valid.code === "")
                    errors["code"] = i18n.__("BookingOrder.code.isRequired:%s is required", i18n.__("BookingOrder.code._:Code"));
                if (duplicateBooking) {
                    errors["code"] = i18n.__("BookingOrder.code.isExists:%s is already exists", i18n.__("BookingOrder.code._:Code"));
                }
                if(!valid.bookingDate || valid.bookingDate === '')
                    errors["bookingDate"] = i18n.__("BookingOrder.bookingDate.isRequired:%s is required", i18n.__("BookingOrder.bookingDate._:BookingDate"));

                if(!valid.deliveryDate || valid.deliveryDate === '')
                    errors["deliveryDate"] = i18n.__("BookingOrder.deliveryDate.isRequired:%s is required", i18n.__("BookingOrder.deliveryDate._:DeliveryDate"));

                if(!valid.styleId || valid.styleId==='')
                    errors["style"] = i18n.__("BookingOrder.style.isRequired:%s is required", i18n.__("BookingOrder.style._:Style"));
                else if(!_style)
                    errors["style"] = i18n.__("BookingOrder.style.isNotFound:%s is not found", i18n.__("BookingOrder.style._:Style"));

                if(!valid.garmentBuyerId || valid.garmentBuyerId==='')
                    errors["buyer"] = i18n.__("BookingOrder.buyer.isRequired:%s is required", i18n.__("BookingOrder.buyer._:Buyer"));
                else if(!_buyer)
                    errors["buyer"] = i18n.__("BookingOrder.buyer.isNotFound:%s is not found", i18n.__("BookingOrder.buyer._:Buyer"));

                if(!valid.standardHourId || valid.standardHourId==='')
                    errors["standardHour"] = i18n.__("BookingOrder.standardHour.isRequired:%s is required", i18n.__("BookingOrder.standardHour._:StandardHour"));
                else if(!_sh)
                    errors["standardHour"] = i18n.__("BookingOrder.standardHour.isNotFound:%s is not found", i18n.__("BookingOrder.standardHour._:StandardHour"));
                
                if(!valid.orderQuantity || valid.orderQuantity<=0)
                    errors["orderQuantity"] = i18n.__("BookingOrder.orderQuantity.isRequired:%s is required", i18n.__("BookingOrder.orderQuantity._:OrderQuantity"));
                else{
                    var totalqty = 0;
                    if (valid.details.length > 0) {
                        for (var i of valid.details) {
                            totalqty += i.quantity;
                        }
                    }
                    if (valid.orderQuantity != totalqty) {
                        errors["orderQuantity"] = i18n.__("BookingOrder.orderQuantity.shouldNot:%s should equal SUM quantity in details", i18n.__("BookingOrder.orderQuantity._:OrderQuantity")); 

                    }
                }

                if (!valid.deliveryDate || valid.deliveryDate === "") {
                     errors["deliveryDate"] = i18n.__("BookingOrder.deliveryDate.isRequired:%s is required", i18n.__("BookingOrder.deliveryDate._:DeliveryDate")); 
                }
                else{
                    valid.deliveryDate=new Date(valid.deliveryDate);
                    valid.bookingDate=new Date(valid.bookingDate);
                    if(valid.bookingDate>valid.deliveryDate){
                        errors["deliveryDate"] = i18n.__("BookingOrder.deliveryDate.shouldNot:%s should not be less than booking date", i18n.__("BookingOrder.deliveryDate._:DeliveryDate")); 
                    }
                }

                valid.details = valid.details || [];
                if (valid.details && valid.details.length <= 0) {
                    errors["details"] = i18n.__("BookingOrder.details.isRequired:%s is required", i18n.__("BookingOrder.details._:Details")); 
                }
                else if (valid.details.length > 0) {
                    var detailErrors = [];
                    var totalqty = 0;
                    for (var i of valid.details) {
                        totalqty += i.quantity;
                    }
                    for (var detail of valid.details) {
                        var detailError = {};
                        if (!detail.week)
                            detailError["week"] = i18n.__("BookingOrder.details.week.isRequired:%s is required", i18n.__("BookingOrder.details.week._:Week")); 
                        
                        if (!detail.weeklyPlanId ||detail.weeklyPlanId=="")
                            detailError["weeklyPlan"] = i18n.__("BookingOrder.details.weeklyPlan.isRequired:%s is required", i18n.__("BookingOrder.details.weeklyPlan._:WeeklyPlan")); 
                        else{
                            if(!detail.weeklyPlanId)
                                detail.weeklyPlanId=new ObjectId(detail.weeklyPlan._id);
                            if(detail.weeklyPlan)
                                detail.weeklyPlanYear=detail.weeklyPlan.year;
                        }
                        if (!detail.unitId||detail.unitId=="")
                            detailError["unit"] = i18n.__("BookingOrder.details.unit.isRequired:%s is required", i18n.__("BookingOrder.details.unit._:Week")); 

                        if (!detail.quantity || detail.quantity <=0)
                            detailError["quantity"] = i18n.__("BookingOrder.details.quantity.isRequired:%s is required", i18n.__("BookingOrder.details.quantity._:Quantity")); 
                        
                        if (valid.orderQuantity != totalqty)
                            detailError["total"] = i18n.__("ProductionOrder.details.total.shouldNot:%s Total should equal Order Quantity", i18n.__("ProductionOrder.details.total._:Total"));

                        if (Object.getOwnPropertyNames(detailError).length > 0)
                        detailErrors.push(detailError);
                    }

                    
                    
                    if (detailErrors.length > 0)
                        errors.details = detailErrors;

                }
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if(_style){
                    valid.styleId=new ObjectId(_style._id);
                    valid.style=_style;
                }

                if(_sh){
                    valid.standardHourId=new ObjectId(_sh._id);
                    valid.standardHour=_sh;
                }

                if(_buyer){
                    valid.garmentBuyerId=new ObjectId(_buyer._id);
                    valid.garmentBuyerName=_buyer.name;
                    valid.garmentBuyerCode=_buyer.code;
                }

                if (!valid.stamp) {
                    valid = new BookingOrder(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    // post(listBookingOrder) {
    //     var getBookingByIds = [];
    //     return new Promise((resolve, reject) => {
    //         for (var bookingOrder of listBookingOrder) {
    //             getBookingByIds.push(this.getSingleByIdOrDefault(bookingOrder._id));
    //         }
    //         Promise.all(getBookingByIds)
    //             .then(validBookingOrder => {
    //                 var jobUpdate = [];
    //                 for (var booking of listBookingOrder) {
    //                     booking.isConfirmed=true;
    //                     jobUpdate.push(this.update(booking));
    //                 }
    //                 Promise.all(jobUpdate)
    //                     .then(result => {
    //                         resolve(result);
    //                     })
    //                     .catch(e => {
    //                         reject(e);
    //                     });

    //             })
    //             .catch(e => {
    //                 reject(e);
    //             });
    //     });

    // }

    post(listBookingOrder) {
        var getBookingById = listBookingOrder.map((bookingOrder) => this.getSingleByIdOrDefault(bookingOrder._id));
        return Promise.all(getBookingById)
            .then((bookingOrders) => {
                var jobs=[];
                for(var booking of bookingOrders){
                    booking.isConfirmed=true;
                    jobs.push(this.update(booking));
                }
                return Promise.all(jobs)
                    .then((results) => 
                    Promise.resolve(results))
                // var jobs = bookingOrders.map((_bookingOrder) => {
                //     return this._validate(_bookingOrder)
                //         .then((bookingOrder) => {
                //             bookingOrder.isPosted = true;
                //             return this.update(bookingOrder);
                //         })
                //         .then((bookingOrders) => {
                //             return Promise.all(jobs);
                //         })
                //         .then((bookingOrderIds) => {
                //             return Promise.resolve(bookingOrderIds);
                //         });
                // });
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentMasterPlan.collection.BookingOrder}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.garmentMasterPlan.collection.BookingOrder}_code`,
            key: {
                "code": 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}