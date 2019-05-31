"use strict"

require("should");
var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var SewingBlockingPlan = DLModels.garmentMasterPlan.SewingBlockingPlan;
var SewingBlockingPlanDetail = DLModels.garmentMasterPlan.SewingBlockingPlanDetail;
var SewingBlockingPlanDetailItem = DLModels.garmentMasterPlan.SewingBlockingPlanDetailItem;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var WeeklyPlanManager = require('./weekly-plan-manager');
var GarmentBuyerManager = require('../master/garment-buyer-manager');
var BookingOrderManager = require('./booking-order-manager');
var MasterPlanComodityManager = require('./master-plan-comodity-manager');
var UnitManager = require('../master/unit-manager');
var generateCode = require("../../utils/code-generator");

module.exports = class SewingBlockingPlanManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.SewingBlockingPlan);
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

    _beforeInsert(sewingBlockingPlan) {
        sewingBlockingPlan.code = !sewingBlockingPlan.code ? generateCode() : sewingBlockingPlan.code;
        sewingBlockingPlan._active = true;
        sewingBlockingPlan._createdDate = new Date();
        return Promise.resolve(sewingBlockingPlan);
    }

    _validate(sewingBlockingPlan) {
        var errors = {};
        var valid = sewingBlockingPlan;
        // 1. begin: Declare promises.

        var getSewingBlockingPlan = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            bookingOrderNo: valid.bookingOrderNo ? valid.bookingOrderNo : "",
            _deleted: false
        });
        var units = [];
        var weeks = [];
        var comodities = [];
        if (valid.details && valid.details.length > 0) {
            for (var detail of valid.details) {
                if (detail.unitId && ObjectId.isValid(detail.unitId))
                    units.push(new ObjectId(detail.unitId));
                if (detail.weeklyPlanYear)
                    weeks.push(detail.weeklyPlanYear);
                if (detail.masterPlanComodity) {
                    //detail.masterPlanComodityId=new ObjectId(detail.masterPlanComodity._id)
                    if (detail.masterPlanComodityId && ObjectId.isValid(detail.masterPlanComodityId))
                        comodities.push(new ObjectId(detail.masterPlanComodityId));
                }
            }
        }
        var getBuyer = valid.garmentBuyerId && ObjectId.isValid(valid.garmentBuyerId) ? this.garmentBuyerManager.getSingleByIdOrDefault(new ObjectId(valid.garmentBuyerId)) : Promise.resolve(null);
        var getBookingOrder = valid.bookingOrderId && ObjectId.isValid(valid.bookingOrderId) ? this.bookingOrderManager.getSingleByIdOrDefault(new ObjectId(valid.bookingOrderId)) : Promise.resolve(null);
        var getUnits = units.length > 0 ? this.unitManager.collection.find({ "_id": { "$in": units } }).toArray() : Promise.resolve([]);
        var getWeeklyPlan = weeks.length > 0 ? this.weeklyPlanManager.collection.find({ "year": { "$in": weeks } }).toArray() : Promise.resolve([]);
        var getComodity = comodities.length > 0 ? this.masterPlanComodityManager.collection.find({ "_id": { "$in": comodities } }).toArray() : Promise.resolve([]);

        // 2. begin: Validation.
        return Promise.all([getSewingBlockingPlan, getBuyer, getBookingOrder, getUnits, getWeeklyPlan, getComodity])
            .then(results => {
                var _sewingBlockingPlan = results[0];
                var _buyer = results[1];
                var _bookingOrder = results[2];
                var _units = results[3];
                var _weeklyPlan = results[4];
                var _comodities = results[5];

                if (!valid.bookingOrderNo || valid.bookingOrderNo === "")
                    errors["bookingOrderNo"] = i18n.__("SewingBlockingPlan.bookingOrderNo.isRequired:%s is required", i18n.__("SewingBlockingPlan.bookingOrderNo._:BookingOrderNo"));
                else if (_sewingBlockingPlan)
                    errors["bookingOrderNo"] = i18n.__("SewingBlockingPlan.bookingOrderNo.isExists:%s is already exists in Master Plan", i18n.__("SewingBlockingPlan.bookingOrderNo._:BookingOrderNo"));
                else if (!_bookingOrder)
                    errors["bookingOrderNo"] = i18n.__("SewingBlockingPlan.bookingOrderNo.isNotExists:%s is not exists", i18n.__("SewingBlockingPlan.bookingOrderNo._:BookingOrderNo"));

                if (!valid.details || valid.details.length === 0)
                    errors["detail"] = "detail must have 1 item";
                else {
                    var detailErrors = [];
                    var totalDetail = 0;
                    for (var detail of valid.details) {
                        var detailError = {};
                        totalDetail += (!detail.quantity ? 0 : detail.quantity);
                        // if(!detail.shCutting || detail.shCutting === 0)
                        //     detailError["shCutting"] = i18n.__("SewingBlockingPlan.details.shCutting.mustGreater:%s must greater than 0", i18n.__("SewingBlockingPlan.details.shCutting._:Sh Cutting"));
                        if (!detail.shSewing || detail.shSewing === 0)
                            detailError["shSewing"] = i18n.__("SewingBlockingPlan.details.smvSewing.mustGreater:%s must greater than 0", i18n.__("SewingBlockingPlan.details.smvSewing._:SMV Sewing"));
                        // if(!detail.shFinishing || detail.shFinishing === 0)
                        //     detailError["shFinishing"] = i18n.__("SewingBlockingPlan.details.shFinishing.mustGreater:%s must greater than 0", i18n.__("SewingBlockingPlan.details.shFinishing._:Sh Finishing"));
                        if (!detail.quantity || detail.quantity === 0)
                            detailError["quantity"] = i18n.__("SewingBlockingPlan.details.quantity.mustGreater:%s must greater than 0", i18n.__("SewingBlockingPlan.details.quantity._:Quantity"));

                        if ((detail.isConfirmed && !detail.masterPlanComodityId) || (detail.isConfirmed && detail.masterPlanComodityId === ""))
                            detailError["masterPlanComodity"] = i18n.__("SewingBlockingPlan.details.masterPlanComodity.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.masterPlanComodity._:Master Plan Comodity"));
                        else if (detail.masterPlanComodityId) {
                            var id = ObjectId.isValid(detail.masterPlanComodityId) && typeof (detail.masterPlanComodityId) === 'object' ? detail.masterPlanComodityId.toString() : detail.masterPlanComodityId;
                            var comoditySelected = _comodities.find(select => select._id.toString() === id);
                            if (!comoditySelected)
                                detailError["masterPlanComodity"] = i18n.__("SewingBlockingPlan.details.masterPlanComodity.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.masterPlanComodity._:Master Plan Comodity"));
                        }


                        if (!detail.deliveryDate || detail.deliveryDate === '')
                            detailError["deliveryDate"] = i18n.__("SewingBlockingPlan.details.deliveryDate.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.deliveryDate._:DeliveryDate"));
                        else {
                            if (_bookingOrder) {
                                _bookingOrder.bookingDate = new Date(_bookingOrder.bookingDate);
                                detail.deliveryDate = new Date(detail.deliveryDate);
                                if (detail.deliveryDate < _bookingOrder.bookingDate) {
                                    detailError["deliveryDate"] = i18n.__("SewingBlockingPlan.details.deliveryDate.shouldNot:%s should not be less than booking order date", i18n.__("SewingBlockingPlan.details.deliveryDate._:DeliveryDate"));
                                }
                                if (detail.deliveryDate > _bookingOrder.deliveryDate) {
                                    detailError["deliveryDate"] = i18n.__("SewingBlockingPlan.details.deliveryDates.shouldNot:%s should not be more than booking order delivery date", i18n.__("SewingBlockingPlan.details.deliveryDate._:DeliveryDate"));
                                }
                            }
                        }
                        if (!detail.unitId || detail.unitId === "")
                            detailError["unit"] = i18n.__("SewingBlockingPlan.details.unit.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.unit._:Unit"));
                        else if (!_units || _units.length === 0)
                            detailError["unit"] = i18n.__("SewingBlockingPlan.details.unit.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.unit._:Unit"));
                        else {
                            var id = ObjectId.isValid(detail.unitId) && typeof (detail.unitId) === 'object' ? detail.unitId.toString() : detail.unitId;
                            var unitSelected = _units.find(select => select._id.toString() === id);
                            if (!unitSelected)
                                detailError["unit"] = i18n.__("SewingBlockingPlan.details.unit.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.unit._:Unit"));
                        }

                        if (!detail.masterPlanComodityId || detail.masterPlanComodityId === "")
                            detailError["masterPlanComodity"] = i18n.__("SewingBlockingPlan.details.masterPlanComodity.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.masterPlanComodity._:MasterPlanComodity"));

                        if (!detail.efficiency || detail.efficiency <= 0)
                            detailError["efficiency"] = i18n.__("SewingBlockingPlan.details.efficiency.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.efficiency._:Efficiency"));

                        if (!detail.weeklyPlanYear || detail.weeklyPlanYear === "" || detail.weeklyPlanYear === 0 || !detail.weeklyPlanId || detail.weeklyPlanId === "")
                            detailError["weeklyPlanYear"] = i18n.__("SewingBlockingPlan.details.weeklyPlanYear.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.weeklyPlanYear._:Weekly Plan Year"));
                        else if (!_weeklyPlan || _weeklyPlan.length === 0)
                            detailError["weeklyPlanYear"] = i18n.__("SewingBlockingPlan.details.weeklyPlanYear.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.weeklyPlanYear._:Weekly Plan Year"));
                        else {
                            var id = ObjectId.isValid(detail.weeklyPlanId) && typeof (detail.weeklyPlanId) === 'object' ? detail.weeklyPlanId.toString() : detail.weeklyPlanId;
                            var weeklyPlan = _weeklyPlan.find(select => select._id.toString() === id);
                            if (!weeklyPlan)
                                detailError["weeklyPlanYear"] = i18n.__("SewingBlockingPlan.details.weeklyPlanYear.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.weeklyPlanYear._:Weekly Plan Year"));
                            else {
                                if (!detail.week)
                                    detailError["week"] = i18n.__("SewingBlockingPlan.details.week.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.week._:Week"));
                                else {
                                    var weekDay = weeklyPlan.items.find(select => select.weekNumber === detail.week.weekNumber && select.month === detail.week.month && select.efficiency === detail.week.efficiency && select.operator === detail.week.operator);
                                    if (!weekDay)
                                        detailError["week"] = i18n.__("SewingBlockingPlan.details.week.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.week._:Week"));
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
                    // if(totalDetail > valid.quantity)
                    //     errors["detail"] = `Quantity can not be more than ${valid.quantity}`;
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                if (_bookingOrder) {
                    valid.bookingOrderId = _bookingOrder._id;
                    valid.bookingOrderNo = _bookingOrder.code;
                    valid.bookingDate = _bookingOrder.bookingDate;
                    valid.deliveryDate = _bookingOrder.deliveryDate;
                    valid.quantity = _bookingOrder.orderQuantity;
                    valid.remark = _bookingOrder.remark;
                    valid.bookingItems = _bookingOrder.items;
                }
                var details = [];
                var index = 0;
                for (var detail of valid.details) {
                    detail.code = !detail.code ? generateCode() + index.toString() : detail.code;
                    var unitId = ObjectId.isValid(detail.unitId) && typeof (detail.unitId) === 'object' ? detail.unitId.toString() : detail.unitId;
                    var unitSelected = _units.find(select => select._id.toString() === unitId);
                    if (unitSelected) {
                        detail.unitId = unitSelected._id;
                        detail.unit = unitSelected;
                    }
                    var weeklyPlanId = ObjectId.isValid(detail.weeklyPlanId) && typeof (detail.weeklyPlanId) === 'object' ? detail.weeklyPlanId.toString() : detail.weeklyPlanId;
                    var weeklyPlan = _weeklyPlan.find(select => select._id.toString() === weeklyPlanId);
                    if (weeklyPlan) {
                        detail.weeklyPlanId = weeklyPlan._id;
                        detail.weeklyPlanYear = weeklyPlan.year;
                        var weekDay = weeklyPlan.items.find(select => select.weekNumber === detail.week.weekNumber && select.month === detail.week.month && select.efficiency === detail.week.efficiency && select.operator === detail.week.operator);
                        if (weekDay) {
                            detail.week = weekDay;
                            // detail.week.remainingEH-=detail.ehBooking;
                            // detail.week.usedAH+=detail.ehBooking;
                        }
                    }
                    if (detail.masterPlanComodityId) {
                        var masterPlanComodityId = ObjectId.isValid(detail.masterPlanComodityId) && typeof (detail.masterPlanComodityId) === 'object' ? detail.masterPlanComodityId.toString() : detail.masterPlanComodityId;
                        var masterPlanComodity = _comodities.find(select => select._id.toString() === masterPlanComodityId);
                        if (masterPlanComodity) {
                            detail.masterPlanComodityId = masterPlanComodity._id;
                            detail.masterPlanComodity = masterPlanComodity;
                        }
                    } else {
                        detail.masterPlanComodityId = null;
                        detail.masterPlanComodity = null;
                    }
                    detail.deliveryDate = new Date(detail.deliveryDate);
                    if (!detail.stamp) {
                        detail = new SewingBlockingPlanDetail(detail);
                    }
                    detail._createdDate = valid._createdDate;
                    detail.stamp(this.user.username, "manager");
                    details.push(detail);
                    index++;
                }
                valid.details = details;
                if (_buyer) {
                    valid.garmentBuyerId = _buyer._id;
                    valid.garmentBuyerName = _buyer.name;
                    valid.garmentBuyerCode = _buyer.code;
                }

                if (!valid.hasOwnProperty('status'))
                    valid["status"] = "Booking";
                if (!valid.stamp) {
                    valid = new SewingBlockingPlan(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    // _afterInsert(id) {
    //     return new Promise((resolve, reject) => {
    //         this.getSingleById(id)
    //             .then(data => {
    //                 this.bookingOrderManager.getSingleById(data.bookingOrderId)
    //                     .then(booking =>{
    //                         booking.isMasterPlan = true;
    //                         this.bookingOrderManager.collection.update(booking)
    //                             .then(idBooking=>{
    //                                 resolve(id);
    //                             })
    //                             .catch(e => {
    //                                 reject(e);
    //                             });
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

    _beforeUpdate(data) {
        return this.getSingleById(data._id)
            .then(masterPlan => {
                var weeks = [];
                var flags = [], output = [], l = masterPlan.details.length;
                for (var i = 0; i < l; i++) {
                    if (flags[masterPlan.details[i].weeklyPlanId.toString()]) continue;
                    flags[masterPlan.details[i].weeklyPlanId.toString()] = true;
                    output.push(this.weeklyPlanManager.getSingleById(masterPlan.details[i].weeklyPlanId));
                }
                return Promise.all(output)
                    .then(weeklyPlans => {
                        var updateWeek = [];
                        // for(var mp of masterPlan.details){
                        //     //for(var w of weeklyPlans){
                        //         //if(w.unit.code===mp.unit.code && w.year==mp.weeklyPlanYear){
                        //             mp.week.remainingEH+=mp.ehBooking;
                        //             mp.week.usedEH-=mp.ehBooking;
                        //           //  w.items[mp.week.weekNumber-1]= mp.week;  
                        //            // break;                                      
                        //        // }
                        //     //}
                        //     updateWeek.push(this.weeklyPlanManager.collection.update(w));
                        //     for(var detail of data.details){
                        //         if(mp.masterPlanComodityId.toString()===detail.masterPlanComodityId.toString() && mp.unitId.toString() === detail.unitId.toString() && mp.weeklyPlanYear===detail.weeklyPlanYear){
                        //             if(detail.week){
                        //                 if(detail.week.weekNumber===mp.week.weekNumber){
                        //                     detail.week=mp.week;
                        //                 }
                        //             }
                        //         }
                        //     }
                        // }
                        for (var w of weeklyPlans) {
                            for (var mp of masterPlan.details) {
                                if (w.unit.code === mp.unit.code && w.year == mp.weeklyPlanYear) {
                                    w.items[mp.week.weekNumber - 1].usedEH -= mp.ehBooking;
                                    w.items[mp.week.weekNumber - 1].remainingEH += mp.ehBooking;
                                }
                            }
                            updateWeek.push(this.weeklyPlanManager.collection.update(w));
                        }
                        for (var mp of masterPlan.details) {
                            mp.week.remainingEH += mp.ehBooking;
                            mp.week.usedEH -= mp.ehBooking;
                        }

                        return Promise.all(updateWeek)
                            .then(result => {
                                return this.collection.update(masterPlan);
                            })
                            .then(() => {
                                return Promise.resolve(data);
                            })
                    })
            })

    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then(masterPlan => {
                var weeks = [];
                masterPlan.status = "Booking";
                var flags = [], output = [], l = masterPlan.details.length;
                for (var i = 0; i < l; i++) {
                    if (flags[masterPlan.details[i].weeklyPlanId.toString()]) continue;
                    flags[masterPlan.details[i].weeklyPlanId.toString()] = true;
                    output.push(this.weeklyPlanManager.getSingleById(masterPlan.details[i].weeklyPlanId));
                }
                // for(var detail of masterPlan.details){
                //     weeks.push(this.weeklyPlanManager.getSingleById(detail.weeklyPlanId));
                // }
                return Promise.all(output)
                    .then(weeklyPlans => {
                        var updateWeek = [];
                        // for(var mp of masterPlan.details){
                        //     for(var w of weeklyPlans){
                        //         if(w.unit.code===mp.unit.code && w.year==mp.weeklyPlanYear){
                        //             mp.week.remainingEH-=mp.ehBooking;
                        //             mp.week.usedEH+=mp.ehBooking;
                        //             w.items[mp.week.weekNumber-1]= mp.week;  
                        //             break;                                      
                        //         }
                        //     }
                        //     updateWeek.push(this.weeklyPlanManager.collection.update(w));
                        // }
                        for (var w of weeklyPlans) {
                            for (var mp of masterPlan.details) {
                                if (w.unit.code === mp.unit.code && w.year == mp.weeklyPlanYear) {
                                    w.items[mp.week.weekNumber - 1].usedEH += mp.ehBooking;
                                    w.items[mp.week.weekNumber - 1].remainingEH -= mp.ehBooking;
                                }
                            }
                            updateWeek.push(this.weeklyPlanManager.collection.update(w));
                        }
                        for (var mp of masterPlan.details) {
                            mp.week.remainingEH -= mp.ehBooking;
                            mp.week.usedEH += mp.ehBooking;
                        }
                        return Promise.all(updateWeek)
                            .then(result => {
                                return this.collection.update(masterPlan);
                            });
                    })

            }).then(() =>
                Promise.resolve(id));
    }

    _afterInsert(id) {
        var tasks = [];
        var masterPlanId = id;
        return this.getSingleById(id)
            .then((masterPlan) => {
                var weeks = [];
                var flags = [], output = [], l = masterPlan.details.length;
                for (var i = 0; i < l; i++) {
                    if (flags[masterPlan.details[i].weeklyPlanId.toString()]) continue;
                    flags[masterPlan.details[i].weeklyPlanId.toString()] = true;
                    output.push(this.weeklyPlanManager.getSingleById(masterPlan.details[i].weeklyPlanId));
                }
                return this.bookingOrderManager.getSingleById(masterPlan.bookingOrderId)
                    .then(booking => {
                        booking.isMasterPlan = true;
                        return this.bookingOrderManager.collection.update(booking)
                            .then(idBooking => {
                                return Promise.all(output)
                                    .then(weeklyPlans => {
                                        var updateWeek = [];
                                        for (var w of weeklyPlans) {
                                            for (var mp of masterPlan.details) {
                                                if (w.unit.code === mp.unit.code && w.year == mp.weeklyPlanYear) {
                                                    w.items[mp.week.weekNumber - 1].usedEH += mp.ehBooking;
                                                    w.items[mp.week.weekNumber - 1].remainingEH -= mp.ehBooking;
                                                }

                                                //if(w.unit.code===mp.unit.code && w.year==mp.weeklyPlanYear){   
                                                // mp.week.remainingEH-=mp.ehBooking;
                                                // mp.week.usedEH+=mp.ehBooking; 
                                                // w.items[mp.week.weekNumber-1]= mp.week;  
                                                // break;                                   
                                                // }
                                            }

                                            updateWeek.push(this.weeklyPlanManager.collection.update(w));
                                        }
                                        for (var mp of masterPlan.details) {
                                            mp.week.remainingEH -= mp.ehBooking;
                                            mp.week.usedEH += mp.ehBooking;
                                        }
                                        return Promise.all(updateWeek)
                                            .then(result => {
                                                return this.collection.update(masterPlan);
                                            });
                                    })
                            })
                    })

            })
            .then(results => id);
    }

    delete(data) {
        var tasks = [];
        var masterPlanId = data._id;
        data._deleted = true;
        var weeks = [];
        // for(var detail of data.details){
        //     weeks.push(this.weeklyPlanManager.getSingleById(detail.weeklyPlanId));
        // }
        var flags = [], output = [], l = data.details.length;
        for (var i = 0; i < l; i++) {
            if (flags[data.details[i].weeklyPlanId.toString()]) continue;
            flags[data.details[i].weeklyPlanId.toString()] = true;
            output.push(this.weeklyPlanManager.getSingleById(data.details[i].weeklyPlanId));
        }
        return this.bookingOrderManager.getSingleById(data.bookingOrderId)
            .then(booking => {
                booking.isMasterPlan = false;
                return this.bookingOrderManager.collection.update(booking)
                    .then(idBooking => {
                        return Promise.all(output)
                            .then(weeklyPlans => {
                                var updateWeek = [];
                                for (var w of weeklyPlans) {
                                    for (var mp of data.details) {
                                        if (w.unit.code === mp.unit.code && w.year == mp.weeklyPlanYear) {
                                            w.items[mp.week.weekNumber - 1].usedEH -= mp.ehBooking;
                                            w.items[mp.week.weekNumber - 1].remainingEH += mp.ehBooking;
                                        }

                                        // for(var w of weeklyPlans){
                                        //     for(var mp of data.details){
                                        //         if(w._id.toString()===mp.weeklyPlanId.toString()){
                                        //             mp.week.remainingEH+=mp.ehBooking;
                                        //             mp.week.usedEH-=mp.ehBooking;
                                        //             w.items[mp.week.weekNumber-1]= mp.week;                                   
                                        //         }
                                    }
                                    updateWeek.push(this.weeklyPlanManager.collection.update(w));
                                }


                                return Promise.all(updateWeek).then(result => {
                                    return this.collection.update(data);
                                });
                            })
                    })
            })
            .then(() =>
                Promise.resolve(masterPlanId));
    }


    // getPreview(month, year){
    //     return new Promise((resolve, reject) => {
    //         var deletedQuery = {
    //             _deleted: false
    //         };
    //         var stringDate = month > 10 ? `${year}-${month - 1}-01` : `${year}-0${month - 1}-01`;
    //         var thisDate = new Date(stringDate);
    //         var nextDate = new Date(thisDate.setMonth(thisDate.getMonth() + 6));
    //         var nextMonth = nextDate.getMonth();
    //         var nextYear = nextDate.getFullYear();
    //         var dateQuery = {
    //             "$and" : [
    //                 {"details.week.month" : {"$gte" : (month - 1)}},
    //                 {"details.weeklyPlanYear" : {"$gte" : year}},
    //                 {"details.week.month" : {"$lte" : nextMonth}},
    //                 {"details.weeklyPlanYear" : {"$lte" : nextYear}}
    //             ]
    //         };
    //         this.collection
    //         .aggregate([
    //             { "$unwind": "$details" },
    //             { "$match": dateQuery }, 
    //             {
    //                 "$project": {
    //                     "month": "$details.week.month",
    //                     "week": "$details.week.weekNumber",
    //                     "year": "$details.weeklyPlanYear",
    //                     "unitCode": "$details.unit.code",
    //                     "sh":"$details.shSewing"
    //                 }
    //             },
    //             {
    //                 "$group": {
    //                     "_id": { "month": "$month", "week": "$week", "year": "$year", "unitCode": "$unitCode" },
    //                     "sh": { "$sum": "$sh" }
    //                 }
    //             }

    //         ])
    //         .toArray()
    //         .then(results => {
    //             resolve(results);
    //         })
    //         .catch(e => {
    //             reject(e);
    //         });
    //     });
    // }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentMasterPlan.collection.SewingBlockingPlan}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.garmentMasterPlan.collection.SewingBlockingPlan}_code`,
            key: {
                "code": 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    getReport(query) {
        return new Promise((resolve, reject) => {

            var deletedQuery = { deleted: false };

            var unitQuery = {};
            if (query.unit != "") {
                unitQuery = {
                    "unit": query.unit
                };
            }

            var yearQuery = {};
            if (query.year) {
                yearQuery = {
                    "year": parseInt(query.year)
                };
            }

            var weeklyPlans = map.garmentMasterPlan.collection.WeeklyPlan;
            var bookingOrders = map.garmentMasterPlan.collection.BookingOrder;

            var Query = { "$and": [yearQuery, deletedQuery, unitQuery] };

            this.collection
                .aggregate([
                    { "$unwind": "$details" },
                    { "$lookup": { from: weeklyPlans, localField: "details.weeklyPlanId", foreignField: "_id", as: "weeklyPlans" } },
                    { "$unwind": { path: "$weeklyPlans", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: bookingOrders, localField: "bookingOrderId", foreignField: "_id", as: "bookingOrders" } },
                    { "$unwind": { path: "$bookingOrders", preserveNullAndEmptyArrays: true } },
                    // { "$match": Query},    
                    {
                        "$project": {
                            "buyer": { $concat: ["$garmentBuyerName", "-", "$details.masterPlanComodity.name"] },
                            "year": "$weeklyPlans.year",
                            "weekSewingBlocking": "$details.week.weekNumber",
                            "unit": "$weeklyPlans.unit.code",
                            "SMVSewing": "$details.shSewing",
                            "weekNumber": "$weeklyPlans.items.weekNumber",
                            "weekEndDate": "$weeklyPlans.items.endDate",
                            "bookigQty": "$details.quantity",
                            "isConfirmed": "$details.isConfirmed",
                            "efficiency": "$weeklyPlans.items.efficiency",
                            "workingHoours": "$weeklyPlans.items.workingHours",
                            "AHTotal": "$weeklyPlans.items.ahTotal",
                            "EHTotal": "$weeklyPlans.items.ehTotal",
                            "usedTotal": "$weeklyPlans.items.usedEH",
                            "remainingEH": "$weeklyPlans.items.remainingEH",
                            "operator": "$weeklyPlans.items.operator",
                            "bookingOrderItems": "$bookingOrders.items",
                            "bookingOrdersQuantity": "$bookingOrders.orderQuantity",
                            "deleted": "$_deleted"
                        }
                    },
                    { "$match": Query },

                    {
                        "$group": {
                            _id: {
                                "buyer": "$buyer",
                                "year": "$year",
                                "weekSewingBlocking": "$weekSewingBlocking",
                                "unit": "$unit",
                                "operator": "$operator",
                                "SMVSewing": "$SMVSewing",
                                "isConfirmed": "$isConfirmed",
                                "weekNumber": "$weekNumber",
                                "weekEndDate": "$weekEndDate",
                                "bookingQty": "$bookigQty",
                                "efficiency": "$efficiency",
                                "workingHoours": "$workingHoours",
                                "AHTotal": "$AHTotal",
                                "EHTotal": "$EHTotal",
                                "usedTotal": "$usedTotal",
                                "bookingOrderItems": "$bookingOrderItems",
                                "bookingOrdersQuantity": "$bookingOrdersQuantity",
                                "remainingEH": "$remainingEH"
                            },
                            "BookingQTyTot": { "$sum": "$bookigQty" },
                            "SMVTot": { "$sum": "$SMVSewing" },

                            count: { $sum: 1 }

                        }
                    },

                    {
                        "$sort": {
                            "_id.unit": 1,
                            "_id.buyer": 1
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

    getXls(dataReport, query) {
        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            this.data = [];
            this.dataTemp = [];
            xls.options = [];
            xls.name = '';

            var dateFormat = "DD/MM/YYYY";
            this.dataTemp = [];
            this.data = [];
            this.weeklyNumbers = 0;
            this.WeekQuantity = [];
            for (var pr of dataReport.data) {
                this.weeklyNumbers = pr._id.weekNumber;
                break;
            }


            for (var pr of dataReport.data) {
                var dataTemp = {};
                dataTemp.backgroundColor = [];
                dataTemp.quantity = [];
                dataTemp.efficiency = [];
                dataTemp.unitBuyerQuantity = [];
                //dataTemp.isConfirmed=[];
                dataTemp.units = pr._id.unit;
                dataTemp.buyer = pr._id.buyer;
                dataTemp.unitBuyer = pr._id.unit + ';' + pr._id.buyer;
                dataTemp.SMVTotal = pr.SMVTot;
                dataTemp.dataCount = pr.count;
                dataTemp.operator = pr._id.operator;
                dataTemp.workingHours = pr._id.workingHoours;
                dataTemp.AH = pr._id.AHTotal;
                dataTemp.EH = pr._id.EHTotal;
                dataTemp.usedEH = pr._id.usedTotal;
                dataTemp.remainingEH = pr._id.remainingEH;
                dataTemp.dataCount = pr.count;

                for (var j = 0; j < pr._id.efficiency.length; j++) {
                    dataTemp.efficiency[j] = pr._id.efficiency[j].toString() + '%';
                    dataTemp.backgroundColor[j] = dataTemp.remainingEH[j] > 0 ? "#FFFF00" :
                        dataTemp.remainingEH[j] < 0 ? "#f62c2c" :
                            "#52df46";
                }
                dataTemp.weekSewingBlocking = pr._id.weekSewingBlocking;
                dataTemp.SMVSewings = pr.SMVTot / pr.count;
                dataTemp.SMVSewingWeek = pr._id.weekSewingBlocking;
                dataTemp.bookingQty = pr._id.bookingQty;
                dataTemp.isConfirmed = pr._id.isConfirmed ? 1 : 0;
                for (var i = 0; i < this.weeklyNumbers.length; i++) {
                    if (i + 1 === pr._id.weekSewingBlocking) {
                        dataTemp.quantity[i] = pr._id.bookingQty;

                    }
                    else {
                        dataTemp.quantity[i] = 0;
                    }

                }
                dataTemp.bookingOrderItemsLength = pr._id.bookingOrderItems.length;
                dataTemp.bookingOrdersConfirmQuantity = pr._id.bookingOrderItems.reduce(
                    (acc, cur) => acc + cur.quantity,
                    0
                );
                dataTemp.bookingOrdersQuantity = pr._id.bookingOrdersQuantity;
                this.dataTemp.push(dataTemp);
            }
            // console.log((this.dataTemp));
            //units
            var flags = [], output = [], l = this.dataTemp.length, i;
            for (i = 0; i < l; i++) {
                if (flags[this.dataTemp[i].units]) continue;
                flags[this.dataTemp[i].units] = true;
                output.push(this.dataTemp[i].units);

            }

            var flags = [], output2 = [], l = this.dataTemp.length, i;
            for (i = 0; i < l; i++) {
                if (flags[this.dataTemp[i].unitBuyer]) continue;
                flags[this.dataTemp[i].unitBuyer] = true;
                output2.push({ unit: this.dataTemp[i].units, buyer: this.dataTemp[i].buyer });

            }
            // console.log(output2);
            // //total smvSewing
            // var arr = this.dataTemp,
            //     totalSewing = arr.reduce(function (r, o) {
            //         (r[o.unitBuyer]) ? r[o.unitBuyer] += o.SMVSewings : r[o.unitBuyer] = o.SMVSewings;
            //         return r;
            //     }, {});
            // var totalSewing = Object.keys(totalSewing).map(function (key) {
            //     return { unitBuyer: key, SMVTotal: totalSewing[key] };
            // });

            // //Total per Unit
            // var arr = this.dataTemp,
            //     totalSMV = arr.reduce(function (r, o) {
            //         (r[o.units]) ? r[o.units] += o.SMVTotal : r[o.units] = o.SMVTotal;
            //         return r;
            //     }, {});
            // var groups = Object.keys(totalSMV).map(function (key) {
            //     return { units: key, SMVTotal: totalSMV[key] };
            // });

            // console.log(groups);
            let cat = [];
            let category = [];
            let len = [];
            let bookingOrderItemsLength = [];
            let bookingOrdersConfirmQuantity = [];
            let bookingOrdersQuantity = [];
            for (var c of this.dataTemp) {
                var oye = {};
                if (!cat[c.units + c.buyer + c.weekSewingBlocking]) {
                    cat[c.units + c.buyer + c.weekSewingBlocking] = c.bookingQty;
                }
                else {
                    cat[c.units + c.buyer + c.weekSewingBlocking] += c.bookingQty;
                }

                // if (!category[c.units + c.buyer + c.weekSewingBlocking]) {
                //     category[c.units + c.buyer + c.weekSewingBlocking] = c.isConfirmed;
                // }
                // else
                // {
                //     category[c.units + c.buyer + c.weekSewingBlocking] += c.isConfirmed;
                // }
                // if (!len[c.units + c.buyer + c.weekSewingBlocking]) {
                //     len[c.units + c.buyer + c.weekSewingBlocking] = 1;
                // }
                // else
                // {
                //     len[c.units + c.buyer + c.weekSewingBlocking] += 1;
                // }
                // console.log(c.units + c.buyer + c.weekSewingBlocking, category[c.units + c.buyer + c.weekSewingBlocking], len[c.units + c.buyer + c.weekSewingBlocking]);

                if (!bookingOrderItemsLength[c.units + c.buyer + c.weekSewingBlocking]) {
                    bookingOrderItemsLength[c.units + c.buyer + c.weekSewingBlocking] = c.bookingOrderItemsLength;
                }
                if (!bookingOrdersConfirmQuantity[c.units + c.buyer + c.weekSewingBlocking]) {
                    bookingOrdersConfirmQuantity[c.units + c.buyer + c.weekSewingBlocking] = c.bookingOrdersConfirmQuantity;
                }
                if (!bookingOrdersQuantity[c.units + c.buyer + c.weekSewingBlocking]) {
                    bookingOrdersQuantity[c.units + c.buyer + c.weekSewingBlocking] = c.bookingOrdersQuantity;
                }

                if (!cat[c.units + "TOTAL" + c.weekSewingBlocking]) {
                    cat[c.units + "TOTAL" + c.weekSewingBlocking] = c.bookingQty;
                }
                else {
                    cat[c.units + "TOTAL" + c.weekSewingBlocking] += c.bookingQty;
                }
                if (!cat[c.units + "smv" + c.buyer]) {
                    cat[c.units + "smv" + c.buyer] = c.SMVSewings;
                }
                else {
                    cat[c.units + "smv" + c.buyer] += c.SMVSewings;
                }
                if (!cat[c.units + "count" + c.buyer]) {
                    cat[c.units + "count" + c.buyer] = c.dataCount;
                }
                else {
                    cat[c.units + "count" + c.buyer] += c.dataCount;
                }

                if (!cat[c.units + "efisiensi"]) {
                    cat[c.units + "efisiensi"] = c.efficiency;
                }
                if (!cat[c.units + "operator"]) {
                    cat[c.units + "operator"] = c.operator;
                }
                if (!cat[c.units + "totalAH"]) {
                    cat[c.units + "totalAH"] = c.AH;
                }
                if (!cat[c.units + "totalEH"]) {
                    cat[c.units + "totalEH"] = c.EH;
                }
                if (!cat[c.units + "usedEH"]) {
                    cat[c.units + "usedEH"] = c.usedEH;
                }
                if (!cat[c.units + "workingHours"]) {
                    cat[c.units + "workingHours"] = c.workingHours;
                }
                if (!cat[c.units + "remainingEH"]) {
                    cat[c.units + "remainingEH"] = c.remainingEH;
                }
                if (!cat[c.units + "background"]) {
                    cat[c.units + "background"] = c.backgroundColor;
                }

            }

            for (var j of output) {
                var data = {};
                data.units = j;
                data.collection = [];
                this.sewing = [];
                var un = this.dataTemp.filter(o => (o.units == j));

                var smvTot = 0;
                var counts = 0;
                for (var i of output2) {

                    if (j == i.unit) {
                        data.quantity = [];
                        var background = [];
                        for (var k = 0; k <= this.weeklyNumbers.length; k++) {
                            var categ = j + i.buyer + (k).toString();

                            if (k == 0) {
                                categ = (j + "smv" + i.buyer);
                                data.quantity[k] = (cat[j + "smv" + i.buyer] / cat[j + "count" + i.buyer]) ? Math.round((cat[j + "smv" + i.buyer] / cat[j + "count" + i.buyer])) : '-';
                                smvTot += Math.round(cat[j + "smv" + i.buyer] / cat[j + "count" + i.buyer]);
                                counts += 1;

                            } else {
                                data.quantity[k] = cat[categ] ? cat[categ] : '-';
                            }
                            // if (category[categ] == 0) {

                            //     background[k] = "#eee860";
                            // }
                            // else if(category[categ] == len[categ]) 
                            // {
                            //     background[k] = "#ffffff";

                            // }else
                            // {
                            //     if (category[categ] != undefined) {

                            //         background[k] = "#F4A919";
                            //     }
                            // }

                            if (bookingOrderItemsLength[categ] === 0) {
                                background[k] = "#EEE860";
                            } else if (bookingOrderItemsLength[categ] > 0 && bookingOrdersConfirmQuantity[categ] < bookingOrdersQuantity[categ]) {
                                background[k] = "#F4A919";
                            } else {
                                background[k] = "#FFFFFF";
                            }

                        }
                        data.collection.push({ name: i.buyer, quantity: data.quantity, units: j, background: background, fontWeight: "normal" });
                    }

                }
                var qty = [];
                for (var y = 0; y < this.weeklyNumbers.length; y++) {

                    var categ = j + "TOTAL" + (y + 1).toString();

                    qty[y + 1] = cat[categ] ? cat[categ] : '-';
                    qty[0] = Math.round(smvTot / counts);

                }
                data.collection.push({ name: "TOTAL", quantity: qty, fontWeight: "bold" });
                var eff = cat[j + "efisiensi"];
                var opp = cat[j + "operator"];
                var AH = cat[j + "totalAH"];
                var EH = cat[j + "totalEH"];
                var usedEH = cat[j + "usedEH"];
                var remainingEH = cat[j + "remainingEH"];
                var background = cat[j + "background"];
                var workingHours = cat[j + "workingHours"];
                eff.splice(0, 0, "");
                opp.splice(0, 0, "");
                AH.splice(0, 0, "");
                EH.splice(0, 0, "");
                usedEH.splice(0, 0, "");
                remainingEH.splice(0, 0, "");
                workingHours.splice(0, 0, "");
                background.splice(0, 0, "");
                data.collection.push({ name: "Efisiensi", quantity: eff, fontWeight: "bold" });
                data.collection.push({ name: "Total Operator Sewing", quantity: opp, fontWeight: "bold" });
                data.collection.push({ name: "Working Hours", quantity: workingHours, fontWeight: "bold" });
                data.collection.push({ name: "Total AH", quantity: AH, fontWeight: "bold" });
                data.collection.push({ name: "Total EH", quantity: EH, fontWeight: "bold" });
                data.collection.push({ name: "Used EH", quantity: usedEH, fontWeight: "bold" });
                data.collection.push({ name: "Remaining EH", quantity: remainingEH, background: background, fontWeight: "bold" });
                this.data.push(data);
            }

            this.dataXL = [];

            for (var b of this.data) {
                var dataXL = {};
                for (var data of b.collection) {
                    this.dataXL.push({ unit: b.units, buyer: data.name, quantity: data.quantity, background: data.background, fontWeight: data.fontWeight });
                }

            }
            //style excel
            var border = {
                top: { style: 'thin', color: 'FF000000' },
                bottom: { style: 'thin', color: 'FF000000' },
                left: { style: 'thin', color: 'FF000000' },
                right: { style: 'thin', color: 'FF000000' },
            };

            var fgColor = function (color) {
                return {
                    fgColor: {
                        rgb: color
                    }
                }
            };

            var styles = {
                header: {
                    fill: fgColor('FFCCCCCC'),
                    border: border,
                    alignment: {
                        horizontal: 'center'
                    },
                    font: {
                        bold: true
                    }
                },
                cell: {
                    fill: fgColor('FFFFFFFF'),
                    border: border
                },
                cellBold: {
                    fill: fgColor('FFFFFFFF'),
                    border: border,
                    font: {
                        bold: true
                    }
                },
                cellUnit: {
                    fill: fgColor('FFFFFFFF'),
                    border: border,
                    alignment: {
                        // horizontal: 'center',
                        vertical: 'top'
                    },
                    font: {
                        bold: true
                    }
                },
                cellColor: (color) => {
                    return {
                        fill: {
                            fgColor: {
                                rgb: color
                            }
                        },
                        border: border
                    }
                },
                cellColorBold: (color) => {
                    return {
                        fill: {
                            fgColor: {
                                rgb: color
                            }
                        },
                        border: border,
                        font: {
                            bold: true
                        }
                    }
                },
            };

            var mergeCountEnd = 1;
            var mergeCountStart = 1;
            var unittemp = "";
            xls.options.merges = [];

            for (var b of this.dataXL) {
                var item = {};
                xls.options.specification = {};

                item["background"] = b.background;
                item["fontweight"] = b.fontWeight;

                item["UNIT"] = b.unit;

                if (unittemp != b.unit) {
                    unittemp = b.unit;
                    mergeCountStart = this.dataXL.indexOf(b) + 2;
                    mergeCountEnd = mergeCountStart;

                    xls.options.merges.push(
                        { start: { row: mergeCountStart, column: 1 }, end: { row: mergeCountEnd, column: 1 } }
                    );

                } else {
                    mergeCountEnd = this.dataXL.indexOf(b) + 2;
                    xls.options.merges[xls.options.merges.length - 1] = { start: { row: mergeCountStart, column: 1 }, end: { row: mergeCountEnd, column: 1 } };
                }


                item["BUYER-KOMODITI"] = b.buyer;
                xls.options.specification["UNIT"] = {
                    displayName: "UNIT",
                    width: 50,
                    headerStyle: styles.header,
                    cellStyle: styles.cellUnit
                };
                xls.options.specification["BUYER-KOMODITI"] = {
                    displayName: "BUYER-KOMODITI",
                    width: 300,
                    headerStyle: styles.header,
                    cellStyle: function (value, row) {
                        return value === "TOTAL" ? styles.cellBold :
                            row["SMV Sewing"] === "" ? styles.cellBold :
                                styles.cell;
                    }
                };

                for (var d = 0; d <= this.weeklyNumbers.length; d++) {
                    if (d === 0) {
                        item["SMV Sewing"] = b.quantity[d];
                        xls.options.specification["SMV Sewing"] = {
                            displayName: "SMV Sewing",
                            width: 75,
                            headerStyle: styles.header,
                            cellStyle: function (value, row) {
                                return row["BUYER-KOMODITI"] === "TOTAL" ? styles.cellBold : styles.cell;
                            }
                        };
                    } else {
                        var weekNo = "W" + (d).toString();
                        item[weekNo] = { value: b.quantity[d], weeknumber: d };

                        xls.options.specification[weekNo] = {
                            displayName: weekNo,
                            width: 70,
                            headerStyle: styles.header,
                            cellFormat: function (value) {
                                return value.value;
                            },
                            cellStyle: function (value, row) {
                                if (row["BUYER-KOMODITI"] === "Remaining EH") {
                                    return (value.value > 0) ? styles.cellColorBold('FFFFFF00') :
                                        (value.value < 0) ? styles.cellColorBold('FFFF0000') :
                                            styles.cellColorBold('FF00FF00');

                                } if (row.background) {
                                    return styles.cellColor("FF" + row.background[value.weeknumber].substring(1));
                                } else {
                                    return styles.cellBold;
                                }
                            }
                        };

                    }
                }
                xls.data.push(item);
            }
            // console.log( xls.options.merges);

            xls.name = `Master Plan Report.xlsx`;
            resolve(xls);
        });
    }

    getAcceptedOrderMonitoring(query){
        return new Promise((resolve, reject) => {
            var deletedQuery = { _deleted: false };
            var yearQuery = {};
            if (query.year) {
                yearQuery = {
                    "details.weeklyPlanYear": parseInt(query.year)
                };
            }
            var unitQuery = {};
            if (query.unit !='') {
                unitQuery = {
                    "details.unit.code": query.unit
                };
            }

            var Query = { "$and": [ deletedQuery, yearQuery, unitQuery] };
            this.collection
                .aggregate([
                    { "$unwind": "$details" },
                    { "$match": Query },
                    { "$lookup":{from :'weekly-plans',localField:'details.weeklyPlanId',foreignField:'_id',as:'weeklyPlans'}},
                    { "$unwind": {path:"$weeklyPlans", preserveNullAndEmptyArrays: true} },
                    { "$project": {
                        'unitcode':'$details.unit.code',
                        'week':'$details.week.weekNumber',
                        'qty':'$details.quantity',
                        'unit' :'$weeklyPlans.unit', 
                        'items':'$weeklyPlans.items',
                        }
                    },
                    {"$group": {
                        '_id':{'week':'$week','unitcode':'$unitcode','unit':'$unit','items':'$items'},
                        'qty':{'$sum':'$qty'},
                        }
                    },
                    {
                        "$sort": {

                            "_id.unitcode": 1,
                            "_id.week":1,
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

    getAcceptedOrderMonitoringXls(dataReport, query) {
        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            xls.options = [];
            xls.name = '';
            
            var yr=parseInt(query.year);
            var units = [];
            var total = [];
            var qty = [];
            var weeks = [];

            var deletedQuery = { _deleted: false };
            var yearQuery = {};
            if (query.year) {
                yearQuery = {
                    "year": parseInt(query.year)
                };
            }
            var unitQuery = {};
            if (query.unit !='') {
                unitQuery = {
                    "unit.code": query.unit
                };
            }
            
            var Query = { "$and": [ deletedQuery, yearQuery, unitQuery] };
            var getUnit=   this.db.use(map.garmentMasterPlan.collection.WeeklyPlan)
            .aggregate([
                { "$match": Query },
                { "$project": {
                    'unit' :'$unit.code', 
                    }
                },
                {"$group": {
                    '_id':{'unit':'$unit',},
                    }
                },
                {
                    "$sort": {
                        "_id.unit": 1,
                    }
                }
            ])
            .toArray()
            .then(results=>{
                if(dataReport.data.length!=0){
                for(var x=0; x < dataReport.data.length; x++){
                    var length_week= dataReport.data[x]._id.items.length;
                    break;
                  }
                if(query.unit==''){
                    for(var x=0; x < results.length; x++){
                      if(units.length<=0){
                       units.push(results[x]._id.unit);
                      }
                      var u=units.find(i=> i==results[x]._id.unit);
                      if(!u){
                       units.push(results[x]._id.unit);
                      }
                    }
                }
                else if(query.unit!=''){
                  units.push(query.unit);
                }

                var totalqty=[];
                for(var code of units){
                    for(var x=0; x < dataReport.data.length; x++){
                    if(dataReport.data[x]._id.unitcode==code){
                        if(!totalqty[code]){
                        totalqty[code]=dataReport.data[x].qty;
                        } else {
                        totalqty[code]+=dataReport.data[x].qty; 
                        }
                    } 
                    }
                    if(!totalqty[code]){
                    totalqty[code]='-';
                    }
                }
                total = Object.keys(totalqty).map(function(key) {
                    return totalqty[key];
                });
                
                for(var x=0;x<length_week;x++){
                    var obj=[];
                    var week={
                      weeknumber:'W'+(x+1)
                    }
                    weeks.push(week);
                    for(var y of units){
                      var unit={};
                      var grup= dataReport.data.find(o=>o._id.unitcode==y && o._id.week == (x+1));
                      if(grup){
                        unit={
                          code:y,
                          week:x+1,
                          quantity:grup.qty,
                        }
                      } else {
                        unit={
                          code:y,
                          week:x+1,
                          quantity:'-'
                        }
                      }
                      
                      obj.push(unit);
        
                    }
                    qty.push(obj);
                }
                
                x=0;
                for (var week of weeks) {
                    var item = {};
                    item["Unit"] = week.weeknumber;
                    y=0;
                    for (unit of units) {
                        item[unit] = qty[x][y].quantity;
                        y++;
                    }
                    xls.data.push(item);
                    x++;
                } 
                var i =0; 
                var item_total = {};
                for(var unit of units){    
                    item_total[unit] = total[i];
                    i++;
                }
                item_total["Unit"] = 'TOTAL';
                xls.data.push(item_total);
    
                xls.options["Unit"] = "string";
                for (unit of units) {
                    xls.options[unit] = "string";
                }
            } 
                xls.name = `Monitoring Order Diterima dan Booking Report ` + (query.unit ? `${query.unit}-` : ``) + `${query.year}.xlsx`;
                resolve(xls);
                
            });
        });
    }
}