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

    _beforeInsert(sewingBlockingPlan){
        sewingBlockingPlan.code = !sewingBlockingPlan.code ? generateCode() : sewingBlockingPlan.code;
        sewingBlockingPlan._active = true;
        sewingBlockingPlan._createdDate= new Date();
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
        if(valid.details && valid.details.length > 0){
            for(var detail of valid.details){
                if(detail.unitId && ObjectId.isValid(detail.unitId))
                    units.push(new ObjectId(detail.unitId));
                if(detail.weeklyPlanYear)
                    weeks.push(detail.weeklyPlanYear);
                if(detail.masterPlanComodity){
                    //detail.masterPlanComodityId=new ObjectId(detail.masterPlanComodity._id)
                    if(detail.masterPlanComodityId && ObjectId.isValid(detail.masterPlanComodityId))
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
        return Promise.all([getSewingBlockingPlan,getBuyer,getBookingOrder,getUnits,getWeeklyPlan, getComodity])
            .then(results => {
                var _sewingBlockingPlan = results[0];
                var _buyer = results[1];
                var _bookingOrder=results[2];
                var _units=results[3];
                var _weeklyPlan = results[4];
                var _comodities = results[5];

                if(!valid.bookingOrderNo || valid.bookingOrderNo === "")
                    errors["bookingOrderNo"] = i18n.__("SewingBlockingPlan.bookingOrderNo.isRequired:%s is required", i18n.__("SewingBlockingPlan.bookingOrderNo._:BookingOrderNo"));
                else if (_sewingBlockingPlan)
                    errors["bookingOrderNo"] = i18n.__("SewingBlockingPlan.bookingOrderNo.isExists:%s is already exists in Master Plan", i18n.__("SewingBlockingPlan.bookingOrderNo._:BookingOrderNo"));
                else if (!_bookingOrder)
                    errors["bookingOrderNo"] = i18n.__("SewingBlockingPlan.bookingOrderNo.isNotExists:%s is not exists", i18n.__("SewingBlockingPlan.bookingOrderNo._:BookingOrderNo"));

                if(!valid.details || valid.details.length === 0)
                    errors["detail"] = "detail must have 1 item";
                else{
                    var detailErrors = [];
                    var totalDetail = 0;
                    for(var detail of valid.details){
                        var detailError = {};
                        totalDetail += (!detail.quantity ? 0 : detail.quantity);
                        // if(!detail.shCutting || detail.shCutting === 0)
                        //     detailError["shCutting"] = i18n.__("SewingBlockingPlan.details.shCutting.mustGreater:%s must greater than 0", i18n.__("SewingBlockingPlan.details.shCutting._:Sh Cutting"));
                        if(!detail.shSewing || detail.shSewing === 0)
                            detailError["shSewing"] = i18n.__("SewingBlockingPlan.details.smvSewing.mustGreater:%s must greater than 0", i18n.__("SewingBlockingPlan.details.smvSewing._:SMV Sewing"));
                        // if(!detail.shFinishing || detail.shFinishing === 0)
                        //     detailError["shFinishing"] = i18n.__("SewingBlockingPlan.details.shFinishing.mustGreater:%s must greater than 0", i18n.__("SewingBlockingPlan.details.shFinishing._:Sh Finishing"));
                        if(!detail.quantity || detail.quantity === 0)
                            detailError["quantity"] = i18n.__("SewingBlockingPlan.details.quantity.mustGreater:%s must greater than 0", i18n.__("SewingBlockingPlan.details.quantity._:Quantity"));
                        
                        if((detail.isConfirmed && !detail.masterPlanComodityId) || (detail.isConfirmed && detail.masterPlanComodityId === "") )
                            detailError["masterPlanComodity"] = i18n.__("SewingBlockingPlan.details.masterPlanComodity.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.masterPlanComodity._:Master Plan Comodity"));
                        else if(detail.masterPlanComodityId){
                            var id = ObjectId.isValid(detail.masterPlanComodityId) && typeof(detail.masterPlanComodityId) === 'object' ? detail.masterPlanComodityId.toString() : detail.masterPlanComodityId;
                            var comoditySelected = _comodities.find(select => select._id.toString() === id);
                            if(!comoditySelected)
                                detailError["masterPlanComodity"] = i18n.__("SewingBlockingPlan.details.masterPlanComodity.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.masterPlanComodity._:Master Plan Comodity"));
                        }

                        
                        if(!detail.deliveryDate || detail.deliveryDate === '')
                            detailError["deliveryDate"] = i18n.__("SewingBlockingPlan.details.deliveryDate.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.deliveryDate._:DeliveryDate"));
                        else {
                            if(_bookingOrder){
                                _bookingOrder.bookingDate=new Date(_bookingOrder.bookingDate);
                                detail.deliveryDate=new Date (detail.deliveryDate);
                                if(detail.deliveryDate<_bookingOrder.bookingDate){
                                    detailError["deliveryDate"] = i18n.__("SewingBlockingPlan.details.deliveryDate.shouldNot:%s should not be less than booking order date", i18n.__("SewingBlockingPlan.details.deliveryDate._:DeliveryDate"));
                                }
                                if(detail.deliveryDate>_bookingOrder.deliveryDate){
                                    detailError["deliveryDate"] = i18n.__("SewingBlockingPlan.details.deliveryDates.shouldNot:%s should not be more than booking order delivery date", i18n.__("SewingBlockingPlan.details.deliveryDate._:DeliveryDate"));
                                }
                            }
                        }
                        if(!detail.unitId || detail.unitId === "")
                            detailError["unit"] = i18n.__("SewingBlockingPlan.details.unit.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.unit._:Unit"));
                        else if(!_units || _units.length === 0)
                            detailError["unit"] = i18n.__("SewingBlockingPlan.details.unit.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.unit._:Unit"));
                        else{
                            var id = ObjectId.isValid(detail.unitId) && typeof(detail.unitId) === 'object' ? detail.unitId.toString() : detail.unitId;
                            var unitSelected = _units.find(select => select._id.toString() === id);
                            if(!unitSelected)
                                detailError["unit"] = i18n.__("SewingBlockingPlan.details.unit.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.unit._:Unit"));
                        }

                        if(!detail.masterPlanComodityId || detail.masterPlanComodityId === "")
                            detailError["masterPlanComodity"] = i18n.__("SewingBlockingPlan.details.masterPlanComodity.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.masterPlanComodity._:MasterPlanComodity"));
                        
                        if(!detail.efficiency || detail.efficiency <= 0)
                            detailError["efficiency"] = i18n.__("SewingBlockingPlan.details.efficiency.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.efficiency._:Efficiency"));

                        if(!detail.weeklyPlanYear || detail.weeklyPlanYear === "" || detail.weeklyPlanYear === 0 || !detail.weeklyPlanId || detail.weeklyPlanId === "")
                            detailError["weeklyPlanYear"] = i18n.__("SewingBlockingPlan.details.weeklyPlanYear.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.weeklyPlanYear._:Weekly Plan Year"));
                        else if(!_weeklyPlan || _weeklyPlan.length === 0)
                            detailError["weeklyPlanYear"] = i18n.__("SewingBlockingPlan.details.weeklyPlanYear.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.weeklyPlanYear._:Weekly Plan Year"));
                        else{
                            var id = ObjectId.isValid(detail.weeklyPlanId) && typeof(detail.weeklyPlanId) === 'object' ? detail.weeklyPlanId.toString() : detail.weeklyPlanId;
                            var weeklyPlan = _weeklyPlan.find(select => select._id.toString() === id);
                            if(!weeklyPlan)
                                detailError["weeklyPlanYear"] = i18n.__("SewingBlockingPlan.details.weeklyPlanYear.isNotExists:%s is not Exists", i18n.__("SewingBlockingPlan.details.weeklyPlanYear._:Weekly Plan Year"));
                            else{
                                if(!detail.week)
                                    detailError["week"] = i18n.__("SewingBlockingPlan.details.week.isRequired:%s is required", i18n.__("SewingBlockingPlan.details.week._:Week"));
                                else{ 
                                    var weekDay = weeklyPlan.items.find(select => select.weekNumber === detail.week.weekNumber && select.month === detail.week.month && select.efficiency === detail.week.efficiency && select.operator === detail.week.operator);
                                    if(!weekDay)
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
                        if(weekDay){
                            detail.week = weekDay;
                            // detail.week.remainingEH-=detail.ehBooking;
                            // detail.week.usedAH+=detail.ehBooking;
                        }
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
                        detail = new SewingBlockingPlanDetail(detail);
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
                var weeks=[];
                var flags=[], output=[], l=masterPlan.details.length;
                for(var i=0;i<l;i++){
                    if(flags[masterPlan.details[i].weeklyPlanId.toString()])continue;
                    flags[masterPlan.details[i].weeklyPlanId.toString()]=true;
                    output.push(this.weeklyPlanManager.getSingleById(masterPlan.details[i].weeklyPlanId));
                }
                 return Promise.all(output)
                .then(weeklyPlans=>{
                    var updateWeek=[];
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
                    for(var w of weeklyPlans){
                        for(var mp of masterPlan.details){
                            if(w.unit.code===mp.unit.code && w.year==mp.weeklyPlanYear){
                                w.items[mp.week.weekNumber-1].usedEH-=mp.ehBooking;
                                w.items[mp.week.weekNumber-1].remainingEH+=mp.ehBooking;
                            }
                        }
                        updateWeek.push(this.weeklyPlanManager.collection.update(w));
                    }
                    for(var mp of masterPlan.details){
                        mp.week.remainingEH+=mp.ehBooking;
                        mp.week.usedEH-=mp.ehBooking;
                    }
                    
                    return Promise.all(updateWeek)
                    .then(result=>{
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
                var weeks=[];
                masterPlan.status="Booking";
                var flags=[], output=[], l=masterPlan.details.length;
                for(var i=0;i<l;i++){
                    if(flags[masterPlan.details[i].weeklyPlanId.toString()])continue;
                    flags[masterPlan.details[i].weeklyPlanId.toString()]=true;
                    output.push(this.weeklyPlanManager.getSingleById(masterPlan.details[i].weeklyPlanId));
                }
                // for(var detail of masterPlan.details){
                //     weeks.push(this.weeklyPlanManager.getSingleById(detail.weeklyPlanId));
                // }
                 return Promise.all(output)
                .then(weeklyPlans=>{
                    var updateWeek=[];
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
                    for(var w of weeklyPlans){
                        for(var mp of masterPlan.details){
                            if(w.unit.code===mp.unit.code && w.year==mp.weeklyPlanYear){
                                w.items[mp.week.weekNumber-1].usedEH+=mp.ehBooking;
                                w.items[mp.week.weekNumber-1].remainingEH-=mp.ehBooking;
                            }
                        }
                        updateWeek.push(this.weeklyPlanManager.collection.update(w));
                    }
                    for(var mp of masterPlan.details){
                        mp.week.remainingEH-=mp.ehBooking;
                        mp.week.usedEH+=mp.ehBooking;
                    }
                    return Promise.all(updateWeek)
                    .then(result=>{
                        return this.collection.update(masterPlan);
                    });
                })
                
            }).then(() => 
            Promise.resolve(id));
    }

    _afterInsert(id){
        var tasks=[];
        var masterPlanId=id;
        return this.getSingleById(id)
            .then((masterPlan) => {
                var weeks=[];
                var flags=[], output=[], l=masterPlan.details.length;
                for(var i=0;i<l;i++){
                    if(flags[masterPlan.details[i].weeklyPlanId.toString()])continue;
                    flags[masterPlan.details[i].weeklyPlanId.toString()]=true;
                    output.push(this.weeklyPlanManager.getSingleById(masterPlan.details[i].weeklyPlanId));
                }
                return this.bookingOrderManager.getSingleById(masterPlan.bookingOrderId)
                .then(booking =>{
                    booking.isMasterPlan = true;
                    return this.bookingOrderManager.collection.update(booking)
                    .then(idBooking=>{
                        return Promise.all(output)
                        .then(weeklyPlans=>{
                            var updateWeek=[];
                            for(var w of weeklyPlans){
                                for(var mp of masterPlan.details){
                                    if(w.unit.code===mp.unit.code && w.year==mp.weeklyPlanYear){
                                        w.items[mp.week.weekNumber-1].usedEH+=mp.ehBooking;
                                        w.items[mp.week.weekNumber-1].remainingEH-=mp.ehBooking;
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
                            for(var mp of masterPlan.details){
                                mp.week.remainingEH-=mp.ehBooking;
                                mp.week.usedEH+=mp.ehBooking;
                            }
                            return Promise.all(updateWeek)
                            .then(result=>{
                                return this.collection.update(masterPlan);
                            });
                        })
                    })
                })
                
            })
            .then(results => id);
    }

    delete(data) {
        var tasks=[];
        var masterPlanId=data._id;
        data._deleted=true;
        var weeks=[];
        // for(var detail of data.details){
        //     weeks.push(this.weeklyPlanManager.getSingleById(detail.weeklyPlanId));
        // }
        var flags=[], output=[], l=data.details.length;
        for(var i=0;i<l;i++){
            if(flags[data.details[i].weeklyPlanId.toString()])continue;
            flags[data.details[i].weeklyPlanId.toString()]=true;
            output.push(this.weeklyPlanManager.getSingleById(data.details[i].weeklyPlanId));
        }
        return this.bookingOrderManager.getSingleById(data.bookingOrderId)
        .then(booking =>{
            booking.isMasterPlan = false;
            return this.bookingOrderManager.collection.update(booking)
            .then(idBooking=>{
                return Promise.all(output)
                .then(weeklyPlans=>{
                    var updateWeek=[];
                    for(var w of weeklyPlans){
                        for(var mp of data.details){
                            if(w.unit.code===mp.unit.code && w.year==mp.weeklyPlanYear){
                                w.items[mp.week.weekNumber-1].usedEH-=mp.ehBooking;
                                w.items[mp.week.weekNumber-1].remainingEH+=mp.ehBooking;
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
                    
                    
                    return Promise.all(updateWeek).then(result=>{
                        return this.collection.update(data);
                    });
                })
            })
        })
        .then(() => 
            Promise.resolve(masterPlanId));
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
}