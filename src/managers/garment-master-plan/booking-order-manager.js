"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var BookingOrder = DLModels.garmentMasterPlan.BookingOrder;
var MasterPlan = DLModels.garmentMasterPlan.MasterPlan;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var ComodityManager = require('./master-plan-comodity-manager');
//var MasterPlanManager = require('./master-plan-manager');
var GarmentBuyerManager = require('../master/garment-buyer-manager');
var generateCode = require("../../utils/code-generator");

module.exports = class BookingOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.BookingOrder);
        this.masterPlanCollection = this.db.use(map.garmentMasterPlan.collection.MasterPlan);
        this.comodityManager = new ComodityManager(db, user);
        //this.masterPlanManager = new MasterPlanManager(db, user);
        this.garmentBuyerManager = new GarmentBuyerManager(db, user);
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
            keywordFilter["$or"] = [codeFilter, buyerFilter];
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

        //var getComodity = valid.styleId && ObjectId.isValid(valid.styleId) ? this.styleManager.getSingleByIdOrDefault(new ObjectId(valid.styleId)) : Promise.resolve(null);
        var getBuyer = valid.garmentBuyerId && ObjectId.isValid(valid.garmentBuyerId) ? this.garmentBuyerManager.getSingleByIdOrDefault(new ObjectId(valid.garmentBuyerId)) : Promise.resolve(null);
       
        // valid.details = valid.details || [];
        // var getWeeklyPlan = [];
        // var getUnit = [];
        // for (var detail of valid.details) {
        //     if(!detail.weeklyPlanId)
        //         detail.weeklyPlanId=detail.weeklyPlan && ObjectId.isValid(detail.weeklyPlan._id) ? detail.weeklyPlan._id : "";
        //     var week =detail.weeklyPlan && ObjectId.isValid(detail.weeklyPlanId) ? this.weeklyPlanManager.getSingleByIdOrDefault(detail.weeklyPlanId) : Promise.resolve(null);
        //     getWeeklyPlan.push(week);
        // }
        // 2. begin: Validation.
        return Promise.all([getBooking,getBuyer])
            .then(results => {
                var duplicateBooking = results[0];
                var _buyer=results[1];


                if(!valid.code || valid.code === "")
                    errors["code"] = i18n.__("BookingOrder.code.isRequired:%s is required", i18n.__("BookingOrder.code._:Code"));
                if (duplicateBooking) {
                    errors["code"] = i18n.__("BookingOrder.code.isExists:%s is already exists", i18n.__("BookingOrder.code._:Code"));
                }
                if(!valid.bookingDate || valid.bookingDate === '')
                    errors["bookingDate"] = i18n.__("BookingOrder.bookingDate.isRequired:%s is required", i18n.__("BookingOrder.bookingDate._:BookingDate"));

                if(!valid.deliveryDate || valid.deliveryDate === '')
                    errors["deliveryDate"] = i18n.__("BookingOrder.deliveryDate.isRequired:%s is required", i18n.__("BookingOrder.deliveryDate._:DeliveryDate"));

                if(!valid.garmentBuyerId || valid.garmentBuyerId==='')
                    errors["buyer"] = i18n.__("BookingOrder.buyer.isRequired:%s is required", i18n.__("BookingOrder.buyer._:Buyer"));
                else if(!_buyer)
                    errors["buyer"] = i18n.__("BookingOrder.buyer.isNotFound:%s is not found", i18n.__("BookingOrder.buyer._:Buyer"));

                if(!valid.orderQuantity || valid.orderQuantity<=0)
                    errors["orderQuantity"] = i18n.__("BookingOrder.orderQuantity.isRequired:%s is required", i18n.__("BookingOrder.orderQuantity._:OrderQuantity"));
                else{
                   
                }

                if (!valid.deliveryDate || valid.deliveryDate === "") {
                     errors["deliveryDate"] = i18n.__("BookingOrder.deliveryDate.isRequired:%s is required", i18n.__("BookingOrder.deliveryDate._:DeliveryDate")); 
                }
                else{
                    valid.deliveryDate=new Date(valid.deliveryDate);
                    valid.bookingDate=new Date(valid.bookingDate);
                    var today= new Date();
                    if(valid.bookingDate>valid.deliveryDate){
                        errors["deliveryDate"] = i18n.__("BookingOrder.deliveryDate.shouldNot:%s should not be less than booking date", i18n.__("BookingOrder.deliveryDate._:DeliveryDate")); 
                    }
                    else if(today>valid.deliveryDate){
                        errors["deliveryDate"] = i18n.__("BookingOrder.deliveryDate.shouldNot:%s should not be less than today date", i18n.__("BookingOrder.deliveryDate._:DeliveryDate")); 
                    }
                }

                valid.items = valid.items || [];
                // if (valid.items && valid.items.length <= 0) {
                //     errors["items"] = i18n.__("BookingOrder.items.isRequired:%s is required", i18n.__("BookingOrder.items._:items")); 
                // }
                if (valid.items.length > 0) {
                    if (valid.type==='confirm'){
                        var itemErrors = [];
                        var totalqty = 0;
                        var index=0;
                        for (var i of valid.items) {
                            totalqty += i.quantity;
                        }
                        if (valid.orderQuantity < totalqty) {
                            errors["orderQuantity"] = i18n.__("BookingOrder.orderQuantity.shouldNot:%s should equal or more than SUM quantity in items", i18n.__("BookingOrder.orderQuantity._:OrderQuantity")); 

                        }
                        for (var item of valid.items) {
                            item._createdDate= item._createdDate ? item._createdDate: new Date();
                            item.code= item.code ? index.toString()+item.code: generateCode();
                            var itemError = {};

                            if(!item.masterPlanComodity){
                                itemError["masterPlanComodity"] = i18n.__("BookingOrder.items.masterPlanComodity.isRequired:%s is required", i18n.__("BookingOrder.items.masterPlanComodity._:MasterPlanComodity")); 
                            }
                            else{
                                item.masterPlanComodityId=new ObjectId(item.masterPlanComodity._id);

                                // var existComodity = valid.items.find((test, idx) => 
                                // item.masterPlanComodityId.toString() === test.masterPlanComodity._id.toString() && item.masterPlanComodityId.toString() === test.masterPlanComodity._id.toString() && index != idx);
                            
                                // if(existComodity)
                                //     itemError["masterPlanComodity"] = i18n.__("BookingOrder.items.masterPlanComodity.isExists:%s is already choosen", i18n.__("BookingOrder.items.masterPlanComodity._:MasterPlanComodity"));
                                
                            }
                            
                            if (!item.quantity || item.quantity <=0)
                                itemError["quantity"] = i18n.__("BookingOrder.items.quantity.isRequired:%s is required", i18n.__("BookingOrder.items.quantity._:Quantity")); 
                            
                            // if (valid.orderQuantity != totalqty)
                            //     itemError["total"] = i18n.__("ProductionOrder.items.total.shouldNot:%s Total should equal Order Quantity", i18n.__("ProductionOrder.items.total._:Total"));
                            
                            if (!item.deliveryDate || item.deliveryDate === "") {
                                itemError["deliveryDate"] = i18n.__("BookingOrder.items.deliveryDate.isRequired:%s is required", i18n.__("BookingOrder.items.deliveryDate._:DeliveryDate")); 
                            }
                            else{
                                item.deliveryDate=new Date(item.deliveryDate);
                                var today= new Date();
                                valid.deliveryDate=new Date(valid.deliveryDate);
                                if(today>item.deliveryDate){
                                    itemError["deliveryDate"] = i18n.__("BookingOrder.items.deliveryDate.shouldNot:%s should not be less than today date", i18n.__("BookingOrder.items.deliveryDate._:DeliveryDate")); 
                                }
                                else if (valid.deliveryDate<item.deliveryDate){
                                    itemError["deliveryDate"] = i18n.__("BookingOrder.deliveryDate.shouldNot:%s should not be more than booking deliveryDate date", i18n.__("BookingOrder.items.deliveryDate._:DeliveryDate"));                                 
                                }
                            }

                            index++;
                            itemErrors.push(itemError);
                        }
                        for (var itemError of itemErrors) {
                            if (Object.getOwnPropertyNames(itemError).length > 0) {
                                errors.items = itemErrors;
                                break;
                            }
                        }
                    
                    }
                }
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
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

    cancelBooking(booking){
        return this.getSingleById(booking._id)
            .then((booking) => {
                booking.isCanceled=true;
                return this.update(booking)
                .then((id) =>
                    Promise.resolve(id)
                    );
            });
    }

    // confirmBooking(booking){
    //     return this.getSingleById(booking._id)
    //         .then((booking) => {
    //             booking.isConfirmed=true;
    //             return this.update(booking)
    //             .then((id) =>
    //                 Promise.resolve(id)
    //                 );
    //         });
    // }

    _afterUpdate(id) {
        return new Promise((resolve, reject) => {
            var bookingId=id;
            this.getSingleById(id)
                .then((booking) => {
                    var query = {
                        "bookingOrderNo": booking.code,
                        "_deleted":false
                    };
                    this.masterPlanCollection.singleOrDefault(query)
                        .then((masterPlan) => {
                            if(masterPlan){
                                if(booking.isCanceled){
                                    masterPlan.status="Booking Dibatalkan";
                                }
                                else{
                                    masterPlan.status="Booking Ada Perubahan";
                                    for(var detail of masterPlan.details){
                                        var itemBooking = booking.items.find(select => select.code === detail.code);
                                        if(itemBooking){
                                            detail.isConfirmed = itemBooking.isConfirmed;
                                        }
                                    }
                                }
                                this.masterPlanCollection.update(masterPlan)
                                    .then((id) =>
                                        resolve(bookingId));
                            }
                            else{
                                resolve(bookingId);
                            }
                        });
                        //Promise.resolve(bookingId);
                });
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