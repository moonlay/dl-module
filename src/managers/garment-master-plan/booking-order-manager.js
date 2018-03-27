"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var BookingOrder = DLModels.garmentMasterPlan.BookingOrder;
var SewingBlockingPlan = DLModels.garmentMasterPlan.SewingBlockingPlan;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var ComodityManager = require('./master-plan-comodity-manager');
//var MasterPlanManager = require('./master-plan-manager');
var GarmentBuyerManager = require('../master/garment-buyer-manager');
var GarmentSectionManager = require('../garment-master-plan/garment-section-manager');
var generateCode = require("../../utils/code-generator");
var assert = require('assert');
var moment = require("moment");

module.exports = class BookingOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentMasterPlan.collection.BookingOrder);
        this.sewingBlockingPlanCollection = this.db.use(map.garmentMasterPlan.collection.SewingBlockingPlan);
        this.comodityManager = new ComodityManager(db, user);
        //this.masterPlanManager = new MasterPlanManager(db, user);
        this.garmentBuyerManager = new GarmentBuyerManager(db, user);
        this.garmentSectionManager = new GarmentSectionManager(db, user);
        this.documentNumbers = this.db.collection("document-numbers");
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

    // _beforeInsert(bookingOrder){
    //     bookingOrder.code = !bookingOrder.code ? generateCode() : bookingOrder.code;
    //     bookingOrder._active = true;
    //     bookingOrder._createdDate= new Date();
    //     return Promise.resolve(bookingOrder);
    // }

    _validate(bookingOrder) {
        var errors = {};
        //bookingOrder.code = !bookingOrder.code ? generateCode() : bookingOrder.code;
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

        var getSection = valid.garmentSectionId && ObjectId.isValid(valid.garmentSectionId) ? this.garmentSectionManager.getSingleByIdOrDefault(new ObjectId(valid.garmentSectionId)) : Promise.resolve(null);

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
        return Promise.all([getBooking,getBuyer,getSection])
            .then(results => {
                var duplicateBooking = results[0];
                var _buyer=results[1];
                var _section=results[2];


                // if(!valid.code || valid.code === "")
                //     errors["code"] = i18n.__("BookingOrder.code.isRequired:%s is required", i18n.__("BookingOrder.code._:Code"));
                if (duplicateBooking) {
                    errors["code"] = i18n.__("BookingOrder.code.isExists:%s is already exists", i18n.__("BookingOrder.code._:Code"));
                }
                if(!valid.bookingDate || valid.bookingDate === '')
                    errors["bookingDate"] = i18n.__("BookingOrder.bookingDate.isRequired:%s is required", i18n.__("BookingOrder.bookingDate._:BookingDate"));

                if(!valid.deliveryDate || valid.deliveryDate === '')
                    errors["deliveryDate"] = i18n.__("BookingOrder.deliveryDate.isRequired:%s is required", i18n.__("BookingOrder.deliveryDate._:DeliveryDate"));

                if(!valid.garmentBuyerId || valid.garmentBuyerId==='')
                    errors["buyer"] = i18n.__("BookingOrder.buyer.isRequired:%s is required", i18n.__("BookingOrder.buyer._:Buyer"));
                // if(!_buyer)
                //     errors["buyer"] = i18n.__("BookingOrder.buyer.isNotFound:%s is not found", i18n.__("BookingOrder.buyer._:Buyer"));

                if(!valid.garmentSectionId || valid.garmentSectionId==='')
                    errors["section"] = i18n.__("BookingOrder.section.isRequired:%s is required", i18n.__("BookingOrder.section._:Section"));

                if((!valid.expiredBookingOrder || valid.expiredBookingOrder === 0) && (!valid.canceledBookingOrder || valid.canceledBookingOrder === 0)){
                    if(!valid.orderQuantity || valid.orderQuantity<=0)
                        errors["orderQuantity"] = i18n.__("BookingOrder.orderQuantity.isRequired:%s is required", i18n.__("BookingOrder.orderQuantity._:OrderQuantity"));
                }

                if (!valid.deliveryDate || valid.deliveryDate === "") {
                     errors["deliveryDate"] = i18n.__("BookingOrder.deliveryDate.isRequired:%s is required", i18n.__("BookingOrder.deliveryDate._:DeliveryDate")); 
                }
                else if (!valid.items || valid.items.length === 0) {
                    valid.bookingDate = new Date(valid.bookingDate);
                    valid.deliveryDate = new Date(valid.deliveryDate);
                    valid.bookingDate.setUTCHours(valid.bookingDate.getUTCHours() >= 17 ? 17 : -7, 0, 0, 0);
                    valid.deliveryDate.setUTCHours(valid.deliveryDate.getUTCHours() >= 17 ? 17 : -7, 0, 0, 0);

                    // setUTCHours 17 atau -7 untuk mengubah ke 00:00:00 WIB

                    var next45Days = new Date();
                    next45Days.setUTCHours(next45Days.getUTCHours() >= 17 ? 17 : -7, 0, 0, 0);
                    next45Days.setDate(next45Days.getDate() + 45);

                    if (valid.bookingDate.getTime() > valid.deliveryDate.getTime()) {
                        errors["deliveryDate"] = i18n.__("BookingOrder.DeliveryDate.shouldNotLessThanBookingDate:%s should not be less than booking date", i18n.__("BookingOrder.deliveryDate._:deliveryDate"));
                    } else if (valid.bookingDate.getTime() == valid.deliveryDate.getTime()) {
                        errors["deliveryDate"] = i18n.__("BookingOrder.DeliveryDate.shouldNotSameAsBookingDate:%s should not be the same date as booking date", i18n.__("BookingOrder.deliveryDate._:deliveryDate"));
                    } else if (next45Days.getTime() >= valid.deliveryDate.getTime()) {
                        errors["deliveryDate"] = i18n.__("BookingOrder.DeliveryDate.shouldMoreThan45Days:%s from today date should be more than 45 days", i18n.__("BookingOrder.deliveryDate._:deliveryDate")) + " (" + moment(next45Days).add(7, 'h').format('DD-MMM-YYYY') + ")";
                    }
                    // } else if(today.getTime() > validDeliveryDate.getTime()){
                    //     errors["deliveryDate"] = i18n.__("BookingOrder.DeliveryDate.shouldNot:%s should not be less than today date", i18n.__("BookingOrder.deliveryDate._:deliveryDate")); 
                    // }
                }
                // if(valid.items){
                //     var totalqty = 0;
                //     for (var i of valid.items) {
                //         totalqty += i.quantity;
                //     }
                //     if (valid.orderQuantity < totalqty) {
                //         errors["orderQuantity"] = i18n.__("BookingOrder.orderQuantity.shouldNot:%s should equal or more than SUM quantity in items", i18n.__("BookingOrder.orderQuantity._:OrderQuantity")); 
                //         errors["totalQuantity"]= i18n.__("BookingOrder.totalQuantity.shouldNot:%s should equal or less than booking order quantity", i18n.__("BookingOrder.totalQuantity._:TotalQuantity")); 
                //     }
                // }

                valid.items = valid.items || [];
                // if (valid.items && valid.items.length <= 0) {
                //     errors["items"] = i18n.__("BookingOrder.items.isRequired:%s is required", i18n.__("BookingOrder.items._:items")); 
                // }
                
                if (valid.type==='confirm'){
                    if (valid.items.length > 0) {
                        var itemErrors = [];
                        var index=0;
                        
                        for (var item of valid.items) {
                            item._createdDate= item._createdDate ? item._createdDate: new Date();
                            item.code= !item.code || item.code==valid.code  ? generateCode()+index.toString() : item.code ;
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
                                var check_bookingDate = new Date(valid.bookingDate);
                                check_bookingDate.setUTCHours(check_bookingDate.getUTCHours() >= 17 ? 17 : -7, 0, 0, 0);
                                var check_deliveryDate = new Date(valid.deliveryDate);
                                check_deliveryDate.setUTCHours(check_deliveryDate.getUTCHours() >= 17 ? 17 : -7, 0, 0, 0);
                                var check_item_deliveryDate = new Date(item.deliveryDate);
                                check_item_deliveryDate.setUTCHours(check_item_deliveryDate.getUTCHours() >= 17 ? 17 : -7, 0, 0, 0);

                                if (check_bookingDate.getTime() > check_item_deliveryDate.getTime()) {
                                    itemError["deliveryDate"] = i18n.__("BookingOrder.items.deliveryDates.shouldNot:%s should not be less than booking date", i18n.__("BookingOrder.items.deliveryDate._:DeliveryDate"));
                                } else if (check_bookingDate.getTime() == check_item_deliveryDate.getTime()) {
                                    itemError["deliveryDate"] = i18n.__("BookingOrder.items.deliveryDate2.shouldNot:%s should not be the same date as booking date", i18n.__("BookingOrder.items.deliveryDate._:DeliveryDate")); 
                                } else if (check_deliveryDate.getTime() < check_item_deliveryDate.getTime()) {
                                    itemError["deliveryDate"] = i18n.__("BookingOrder.items.deliveryDatedd.shouldNot:%s should not be more than booking deliveryDate", i18n.__("BookingOrder.items.deliveryDate._:DeliveryDate"));                                 
                                }
                                // item.deliveryDate= new Date(item.deliveryDate.setDate(item.deliveryDate.getDate() + 1));        
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
                    // else 
                    //     errors["detail"] = i18n.__("BookingOrder.detail.mustHaveItem:%s must have at least 1 item", i18n.__("BookingOrder.detail._:Detail"));
                
                }
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                var indexCanceledItem = valid.items.findIndex(item => item.isCanceled);
                if(indexCanceledItem > -1) {
                    var canceledItem = valid.items[indexCanceledItem];
                    valid.canceledItems ?
                        valid.canceledItems.push(canceledItem) :
                        valid.canceledItems = [canceledItem];
                    valid.items.splice(indexCanceledItem, 1);
                }

                if(_buyer){
                    valid.garmentBuyerId=new ObjectId(_buyer._id);
                    valid.garmentBuyerName=_buyer.name;
                    valid.garmentBuyerCode=_buyer.code;
                }

                if(_section){
                    valid.garmentSectionId=new ObjectId(_section._id);
                    valid.garmentSectionName=_section.name;
                    valid.garmentSectionCode=_section.code;
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
                var subtracted = booking.orderQuantity -
                    booking.items.reduce(
                        (total, value) => total + value.quantity
                        , 0
                    );
                    
                booking.orderQuantity -= subtracted;
                booking.canceledBookingOrder = booking.canceledBookingOrder + subtracted;

                booking.canceledDate = new Date();
                booking.isCanceled = booking.items.length <= 0;

                return this.update(booking)
                    .then((id) =>
                        Promise.resolve(id)
                    );
            });
    }

    expiredBooking(booking){
        return this.getSingleById(booking._id)
            .then( (booking) => {
                var query = {
                    "bookingOrderNo": booking.code,
                    "_deleted":false
                };
                booking._updatedDate=new Date();
                booking._updatedBy=this.user.username;
                return this.sewingBlockingPlanCollection.singleOrDefault(query)
                    .then((sewingBlockingPlan) => {
                        var total=0;
                        booking.expiredDeletedDate=new Date();
                        if(booking.items.length>0){
                            for(var qty of booking.items){
                                total+=qty.quantity;
                            }
                        }
                        var leftOver=booking.orderQuantity-total;
                        if(leftOver>0){
                            booking.expiredBookingOrder = booking.expiredBookingOrder + leftOver;
                            booking.orderQuantity-=leftOver;
                        }
                        if(sewingBlockingPlan){
                            if(booking.items.length==0){
                                sewingBlockingPlan.status="Booking Expired";
                            }
                            else{
                                sewingBlockingPlan.status="Booking Ada Perubahan";
                                for(var detail of sewingBlockingPlan.details){
                                    var itemBooking = booking.items.find(select => select.code === detail.code);
                                    if(itemBooking){
                                        detail.isConfirmed = itemBooking.isConfirmed;
                                    }
                                }
                            }
                            return this.sewingBlockingPlanCollection.update(sewingBlockingPlan)
                                .then((id) =>{
                                    return this.collection.update(booking)
                                    .then((id) =>
                                        Promise.resolve(id)
                                        );
                                })
                        }
                        else{
                            return this.collection.update(booking)
                                    .then((id) =>
                                        Promise.resolve(id)
                                        );
                        }
                        
                        
                
            });
            });
    }


    _beforeInsert(data) {
        // salesContract.salesContractNo = salesContract.salesContractNo ? salesContract.salesContractNo : generateCode();
        var dataGarmentSectionCode = data.garmentSectionCode ? data.garmentSectionCode : "";
        var dataGarmentBuyerCode = data.garmentBuyerCode ? data.garmentBuyerCode : "";
        var type = dataGarmentSectionCode + "-" + dataGarmentBuyerCode;
        return this.documentNumbers
            .find({ "type": type }, { "number": 1, "year": 1 })
            .sort({ "year": -1, "number": -1 })
            .limit(1)
            .toArray()
            .then((previousDocumentNumbers) => {

                var yearNow = moment().format("YYYY");

                var number = 1;

                if (!data.code) {
                    if (previousDocumentNumbers.length > 0) {

                        var oldYear = previousDocumentNumbers[0].year;
                        number = yearNow > oldYear ? number : previousDocumentNumbers[0].number + 1;

                        data.code = `${type}-${yearNow.substr(-2)}${this.pad(number, 5)}`;
                    } else {
                        data.code = `${type}-${yearNow.substr(-2)}00001`;
                    }
                }

                var documentNumbersData = {
                    type: type,
                    documentNumber: data.code,
                    number: number,
                    year: yearNow
                }

                return this.documentNumbers
                    .insert(documentNumbersData)
                    .then((id) => {
                        return Promise.resolve(data)
                    })
            })
    }

    pad(number, length) {

        var str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }

        return str;
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
                    this.sewingBlockingPlanCollection.singleOrDefault(query)
                        .then((sewingBlockingPlan) => {
                            if(sewingBlockingPlan){
                                if(booking.isCanceled){
                                    sewingBlockingPlan.status="Booking Dibatalkan";
                                }
                                else{
                                    sewingBlockingPlan.status="Booking Ada Perubahan";
                                    for(var detail of sewingBlockingPlan.details){
                                        var itemBooking = booking.items.find(select => select.code === detail.code);
                                        if(itemBooking){
                                            detail.isConfirmed = itemBooking.isConfirmed;
                                        }
                                    }
                                }
                                this.sewingBlockingPlanCollection.update(sewingBlockingPlan)
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

    delete(data) {
        data._deleted = true;
        return this.sewingBlockingPlanCollection.singleOrDefault({ "bookingOrderNo": data.code,"_deleted":false })
                   .then(sewingBlockingPlan =>{
                       if(sewingBlockingPlan){
                        sewingBlockingPlan.status="Booking Dihapus";
                        return this.sewingBlockingPlanCollection.update(sewingBlockingPlan)
                                   .then(idSewingBlockingPlan=>{
                                         return this.collection.update(data)
                                                   .then(id => {return id});
                                   });
                                }
                                else{
                                    return this.collection.update(data)
                                                   .then(id => {return id});
                                }
                   });
    }

    getBookingOrderReport(query,offset) {
        return new Promise((resolve, reject) => {

            var deletedQuery = { _deleted: false };
            var date = new Date();
            var dateString = moment(date).format('YYYY-MM-DD');
            var dateNow = new Date(dateString);
            var dateBefore = dateNow.setDate(dateNow.getDate() - 30);
            var dateFrom = new Date(query.dateFrom);
            var dateTo = new Date(query.dateTo);
            dateFrom.setUTCHours(dateFrom.getUTCHours() >= 17 ? 17 : -7, 0, 0, 0);
            dateTo.setUTCHours(dateTo.getUTCHours() >= 17 ? 17 : -7, 0, 0, 0);
            
            var dateQuery={};
            if (query.dateFrom !== undefined && query.dateFrom !== "" && query.dateTo !== undefined  && query.dateTo !== "")
            {
                dateQuery = {
                    "bookingDate": {
                        "$gte": dateFrom,
                        "$lte": dateTo,
                    }
                };
            }
            var sectionQuery = {};
            if(query.section) {
                sectionQuery = {
                    "section": query.section
                };
            }
            var codeQuery = {};
            if (query.code) {
                codeQuery = {
                    "bookingCode": query.code
                };
            }
            var buyerQuery = {};
            if (query.buyer) {
                buyerQuery = {
                    "buyer": query.buyer
                };
            }

            var comodityQuery = {};
            if (query.comodity) {
                comodityQuery = {
                    "comodity": query.comodity
                };
            }

            var confirmStateQuery = {};
            if (query.confirmState === "Sudah Dikonfirmasi") {
                confirmStateQuery = {
                    "deliveryDateConfirm":{$ne:"" }
                }
            }else  if (query.confirmState === "Belum Dikonfirmasi") 
            {
                confirmStateQuery = {
                    "deliveryDateConfirm":  ""
                }  
            }
            var bookingOrderStateQuery ={};
            if (query.bookingOrderState === "Booking Dibatalkan") {
                bookingOrderStateQuery = {
                    "isCanceled": true
                }
            }else  if (query.bookingOrderState === "Sudah Dibuat Master Plan") {
                bookingOrderStateQuery = {
                    "isMasterPlan": true,
                    "isCanceled":false
                }
            }else  if (query.bookingOrderState === "Booking") {
                bookingOrderStateQuery = {
                    "isMasterPlan": false ,
                    "isCanceled":false ,
                    "items": {$exists:false}
                    
                }
            }else  if (query.bookingOrderState === "Confirmed") {
                bookingOrderStateQuery = {
                    "isMasterPlan": false ,
                    "isCanceled":false ,
                    "items":{$exists:true}
                    
                }
            }

            var totalOrderQuery={"totalOrderQty":{$ne:0}};
            
             var Query = { "$and": [ dateQuery, deletedQuery, sectionQuery, buyerQuery, comodityQuery, confirmStateQuery, bookingOrderStateQuery, codeQuery, totalOrderQuery] };
            this.collection
                .aggregate( [
                    { "$unwind": {path: "$items", preserveNullAndEmptyArrays: true} },
                    {
                        "$project": {
                            "_updatedDate":"$_updatedDate",
                            "bookingCode": "$code",
                            "section": "$garmentSectionCode",
                            "bookingDate":"$bookingDate",
                            "buyer": "$garmentBuyerName",
                            "totalOrderQty" :"$orderQuantity",
                            "deliveryDateBooking":"$deliveryDate",
                            "orderQty":"$items.quantity",
                            "deliveryDateConfirm":{"$ifNull":["$items.deliveryDate",""]},
                            "remark" :"$items.remark",
                            "isCanceled":"$isCanceled",
                            "comodity":"$items.masterPlanComodity.name",
                            "isMasterPlan":"$isMasterPlan",
                            "_deleted":"$_deleted",
                            "_createdDate":"$_createdDate",
                            "confirmDate":{"$ifNull":["$items._createdDate",""]},
                            "items":"$items",
                        }
                    },
                    { "$match": Query },
                    {
                        "$sort": {
                            "_updatedDate": -1,
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


    getBookingOrderReportXls(dataReport, query,offset) {

        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            xls.options = [];
            xls.name = '';
            var remain=0;
            var temp=dataReport.data;
            var dateFormat = "DD/MM/YYYY";
            var temp_data = {};
            
            this.rowspan=[];
            this.dataXls=[];
            
            var count=0;
            var row_span_count=1;

            for (var data of dataReport.data) {
                var item = {};
                var item_temp = {};
                var rowcount={};
                var confirmstate="";
                var bookingOrderState="";
                if(data.deliveryDateConfirm=="")
                {
                    confirmstate="Belum Dikonfirmasi";
                }else
                {
                    confirmstate="Sudah Dikonfirmasi";
                }
                if(data.isCanceled==true)
                {
                    bookingOrderState="Booking Dibatalkan";
                }else if(data.isMasterPlan ==true)
                {
                    bookingOrderState="Sudah Dibuat Master Plan";   
                }else if(data.isMasterPlan == false && data.isCanceled==false)
                {
                    if(!data.items){
                        bookingOrderState="Booking";
                    } else if(data.items){
                        bookingOrderState="Confirmed";
                    }
                }

                item["Kode Booking"] = data.bookingCode;
                item["Tanggal Booking"] = data.bookingDate ? moment(new Date(data.bookingDate)).add(7, 'h').format(dateFormat) : '';
                item["Buyer"] = data.buyer ? data.buyer : '';
                item["Jumlah Order"] = data.totalOrderQty ? data.totalOrderQty : '';
                item["Tanggal Pengiriman (Booking)"]= data.deliveryDateBooking && data.deliveryDateBooking !="" ? moment(data.deliveryDateBooking ).add(7, 'h').format(dateFormat) : '';
                item["Komoditi"]=data.comodity ? data.comodity : '';
                item["Jumlah Confirm"] = data.orderQty ? data.orderQty : '';
                item["Tanggal Pengiriman(Confirm)"] = data.deliveryDateConfirm && data.deliveryDateConfirm !="" ? moment(new Date(data.deliveryDateConfirm)).add(7, 'h').format(dateFormat) : '';
                item["Tanggal Confirm"] = data.confirmDate && data.confirmDate !="" ? moment(new Date(data.confirmDate)).add(7, 'h').format(dateFormat) : '';
                item["Keterangan"] = data.remark ? data.remark : '';
                item["Status Confirm"] =  confirmstate ? confirmstate : '';
                item["Status Booking Order"] =  bookingOrderState ? bookingOrderState : '';
                for(var items of  temp)
                    {
                        if(data.bookingCode == items.bookingCode)
                        {
                            remain = remain + items.orderQty;
                            item["Sisa Order(Belum Confirm)"]=remain ? data.totalOrderQty-remain :data.totalOrderQty;
                        }
                      
                    }
                var today=new Date();
                var a = moment(new Date(data.deliveryDateBooking)).add(7, 'h').locale('id');
                var b = today;
                a = new Date(a);
                a.setHours(0,0,0,0);
                b.setHours(0,0,0,0);
                var diff=a.getTime() - b.getTime();
                var timeDiff = a.getTime() - b.getTime();
                var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
                          
                if(diffDays>0 && diffDays<=45){
                    item["Selisih Hari (dari Tanggal Pengiriman)"] = diffDays;
                } else if(diffDays<=0 || diffDays>45){
                    item["Selisih Hari (dari Tanggal Pengiriman)"] = '-';
                }

                    if(temp_data.code == data.bookingCode){
                        item_temp["Kode Booking"]='';
                        item_temp["Tanggal Booking"]='';
                        item_temp["Buyer"]='';
                        item_temp["Jumlah Order"]='';
                        item_temp["Status Confirm"]='';
                        item_temp["Status Booking Order"]='';
                        item_temp["Sisa Order(Belum Confirm)"]='';
                        item_temp["Tanggal Pengiriman (Booking)"]='';
                        item_temp["Komoditi"]=item["Komoditi"];
                        item_temp["Tanggal Pengiriman(Confirm)"]=item["Tanggal Pengiriman(Confirm)"];
                        item_temp["Tanggal Confirm"]=item["Tanggal Confirm"];
                        item_temp["Jumlah Confirm"] = item["Jumlah Confirm"];
                        item_temp["Keterangan"]=item["Keterangan"];
                        item_temp["Selisih Hari (dari Tanggal Pengiriman)"]=item["Selisih Hari (dari Tanggal Pengiriman)"];
                        row_span_count=row_span_count+1;
                        rowcount.row_count=row_span_count;
                        
                        rowcount.code=data.bookingCode;
                        xls.data.push(item_temp);
                        this.rowspan.push(rowcount); 
                        
                    } else if(!temp_data.code || temp_data.code!=data.bookingCode){
                        temp_data.code=data.bookingCode;
                        row_span_count=1;
                        rowcount.row_count=row_span_count;
                        rowcount.code=data.bookingCode;
                        xls.data.push(item);
                        this.rowspan.push(rowcount); 
                    }
                    remain=0;
                    
                    xls.options.specification = {};
                    var fgColor = function(color){
                        return {
                            fgColor: {
                                rgb: color
                            }
                        };
                    };
                    var border = {
                        top: { style: 'thin', color: 'FF000000' },
                        bottom: { style: 'thin', color: 'FF000000' },
                        left: { style: 'thin', color: 'FF000000' },
                        right: { style: 'thin', color: 'FF000000' },
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
                        cellUnit: {
                            
                            border: border,
                            alignment: {
                                vertical: 'top'
                            },
                            
                        },
                        cellUnit_2: {
                            border: border,
                            alignment: {
                                horizontal: 'right',
                                vertical: 'top'
                            },
                            
                        },
                    };

                    for(var b of Object.keys(xls.data[0])){
                        
                        if(b=='Tanggal Pengiriman (Booking)' || b=='Tanggal Pengiriman(Confirm)' || b=='Sisa Order(Belum Confirm)'){
                            xls.options.specification[b] = {
                                displayName: b,
                                width: 200,
                                headerStyle: styles.header,
                                cellStyle: styles.cellUnit
                            };
                        }else if(b=='Selisih Hari (dari Tanggal Pengiriman)'){
                            xls.options.specification[b] = {
                                displayName: b,
                                width: 250,
                                headerStyle: styles.header,
                                cellStyle: styles.cellUnit_2
                            };
                        } else {
                            xls.options.specification[b] = {
                                displayName: b,
                                width: 150,
                                headerStyle: styles.header,
                                cellStyle: styles.cellUnit
                            };
                        }
                    };
                     
                    
                    if (this.rowspan[count].row_count>1){
                        for(var x=this.rowspan[count].row_count;0<x;x--){
                            var z=count-x;
                            
                            this.rowspan[z+1].row_count=this.rowspan[count].row_count;
                        }    
                    }
                    count++;  
                }
                
                xls.options.merges = [];
                var d=0;
                for(var a=0;a<xls.data.length;a++){
                    var c=1;
                    for(var b of Object.keys(xls.data[a])){
                        
                        if(xls.data[a]["Kode Booking"]!=='' && (this.rowspan[d].row_count)>1 && (b!=="Komoditi" && b!=="Tanggal Pengiriman(Confirm)" && b!=="Tanggal Confirm" && b!=="Jumlah Confirm" && b!=="Keterangan")){//&& xls.data[a].b && ){
                            xls.options.merges.push(
                                { start: { row: a+2, column: c }, end: { row: (a+(this.rowspan[d].row_count)+1), column: c } }
                            );
                        }
                        c++;
                    }
                    d++;
                }

            xls.options["Kode Booking"] = "string";
            xls.options["Tanggal Booking"] = "string";
            xls.options["Buyer"] = "string";
            xls.options["Jumlah Order"] = "string";
            xls.options["Tanggal Pengiriman(Booking)"] = "string";
            xls.options["Komoditi"] = "string";
            xls.options["Tanggal Pengiriman(Confirm)"] = "string";
            xls.options["Tanggal Confirm"] = "string";
            xls.options["Keterangan"] = "string";
            xls.options["Status Confirm"] = "string";
            xls.options["Status Booking Order"] = "string";
            xls.options["Sisa Order(Belum Confirm)"] = "string";
            xls.options["Selisih Hari (dari Tanggal Pengiriman)"] = "number";

            if (query.dateFrom && query.dateTo) {
                xls.name = `Booking Order ${moment(new Date(query.dateFrom)).add(7, 'h').format(dateFormat)} - ${moment(new Date(query.dateTo)).add(7, 'h').format(dateFormat)}.xlsx`;
            }
            else if (!query.dateFrom && query.dateTo) {
                xls.name = `Booking Order ${moment(new Date(query.dateTo)).add(7, 'h').format(dateFormat)}.xlsx`;
            }
            else if (query.dateFrom && !query.dateTo) {
                xls.name = `Booking Order ${moment(new Date(query.dateFrom)).add(7, 'h').format(dateFormat)}.xlsx`;
            }
            else
                xls.name = `Booking Order Report.xlsx`;

            resolve(xls);
        });
    }

    getCanceledBookingOrderReport(query,offset) {
        return new Promise((resolve, reject) => {
            
            var deletedQuery = { _deleted: false };
            var date = new Date();
            var dateString = moment(date).format('YYYY-MM-DD');
            var dateNow = new Date(dateString);
            var dateBefore = dateNow.setDate(dateNow.getDate() - 30);
            var dateFrom = new Date(query.dateFrom);
            var dateTo = new Date(query.dateTo);
            dateFrom.setUTCHours(dateFrom.getUTCHours() >= 17 ? 17 : -7, 0, 0, 0);
            dateTo.setUTCHours(dateTo.getUTCHours() >= 17 ? 17 : -7, 0, 0, 0);
            
            var dateQuery={};
            if (query.dateFrom !== undefined && query.dateFrom !== "" && query.dateTo !== undefined  && query.dateTo !== "")
            {
                dateQuery = {
                    "bookingDate": {
                        "$gte": dateFrom,
                        "$lte": dateTo,
                    }
                };
            }
            
            var codeQuery = {};
            if (query.code) {
                codeQuery = {
                    "bookingCode": query.code
                };
            }
            var buyerQuery = {};
            if (query.buyer) {
                buyerQuery = {
                    "buyer": query.buyer
                };
            }
            
            var cancelStateQuery = {};
            var cancelStateQueryOr = {};
            if (query.cancelState === "Cancel Confirm") {
                cancelStateQuery = {
                    "canceledItems":{"$ne":[] },
                    "canceledItems":{$exists:true}
                }
            }else  if (query.cancelState === "Cancel Sisa") 
            {
                cancelStateQuery = {
                    "canceledBookingOrder":{"$gt":0}
                }  
            }else if (query.cancelState==="Expired")
            {
                cancelStateQuery = {
                    "expiredBookingOrder":{"$gt":0}
                }
            }
            
             var Query =  [ dateQuery, deletedQuery, buyerQuery, cancelStateQuery, codeQuery] ;
             var queryOr;
             if(query.cancelState==="Cancel Sisa" || query.cancelState==="Expired"){
                queryOr=[{}];
             } else {
                queryOr= [cancelStateQuery];
             }
            this.collection
                .aggregate( [
                    { "$unwind": {path: "$canceledItems", preserveNullAndEmptyArrays: true} },
                    {
                        "$project": {
                            "_updatedDate":"$_updatedDate",
                            "bookingCode": "$code",
                            "bookingDate":"$bookingDate",
                            "buyer": "$garmentBuyerName",
                            "totalOrderQty" :"$orderQuantity",
                            "canceledBookingOrder":"$canceledBookingOrder",
                            "expiredBookingOrder":"$expiredBookingOrder",
                            "deliveryDateBooking":"$deliveryDate",
                            "orderQty":"$canceledItems.quantity",
                            "deliveryDateConfirm":{"$ifNull":["$canceledItems.deliveryDate",""]},
                            "remark" :"$canceledItems.remark",
                            "comodity":"$canceledItems.masterPlanComodity.name",
                            "_deleted":"$_deleted",
                            "_createdDate":"$_createdDate",
                            "cancelItemsDate":"$canceledItems.canceledDate",
                            "canceledDate":"$canceledDate",
                            "expiredDeletedDate":"$expiredDeletedDate",
                            "cancelConfirmDate":{"$ifNull":["$canceledItems._createdDate",""]},
                            "items":"$items",
                            "canceledItems":"$canceledItems"
                        }
                    },
                    { "$match": {"$and":Query,"$or":queryOr} },
                    {
                        "$sort": {
                            "_updatedDate": -1,
                            "bookingCode" : 1,
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


    getCanceledBookingOrderReportXls(dataReport, query,offset) {

        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            xls.options = [];
            xls.name = '';
            var temp=dataReport.data;
            
            var _temp = {};
            var _temp2 = {};
            var _temp3 = {};
            var dateFormat = "DD/MM/YYYY";
            var temp_data = {};
            
            this.rowspan=[];
            this.dataXls=[];
            
            var count=0;
            var row_span_count=1;
            
            for (var data of dataReport.data) {
               var temporaryCancelSisa = {};
               var temporaryExpired = {};  
               var item = {};
               var item_temp = {};
               var rowcount={};
               var temporaryCancelSisa = {};
               var temporaryExpired = {};  

               item["Kode Booking"]=  data.bookingCode;
               item["Tanggal Booking"] =data.bookingDate ? moment(data.bookingDate).add(7, 'h').format("DD MMMM YYYY") : "";;
               item["Buyer"] = data.buyer;
               if((data.canceledBookingOrder==0 || data.canceledBookingOrder==undefined) && (data.expiredBookingOrder==0 || data.expiredBookingOrder==undefined)){
                item["Jumlah Booking Order Awal"] = data.totalOrderQty;
               } else if(data.canceledBookingOrder>0 && data.expiredBookingOrder>0){
                item["Jumlah Booking Order Awal"] = data.totalOrderQty + data.canceledBookingOrder + data.expiredBookingOrder;
               } else if(data.canceledBookingOrder>0 && (data.expiredBookingOrder==0 || data.expiredBookingOrder==undefined)){
                item["Jumlah Booking Order Awal"] =data.totalOrderQty + data.canceledBookingOrder;
               } else if((data.canceledBookingOrder==0 || data.canceledBookingOrder==undefined) && data.expiredBookingOrder>0){
                item["Jumlah Booking Order Awal"]= data.totalOrderQty + data.expiredBookingOrder;
               }

               item["Jumlah Booking Order Akhir"] = data.totalOrderQty;
               item["Tanggal Pengiriman (Booking)"]= data.deliveryDateBooking ? moment(data.deliveryDateBooking).add(7, 'h').format("DD MMMM YYYY") : "";  

                 if(!data.canceledItems) {
                    item["Komoditi"]="";
                    item["Jumlah Confirm"]="";
                    item["Tanggal Confirm"]="";
                    item["Tanggal Pengiriman (Confirm)"]="";
                    item["Keterangan"]="";
                 } else {
                    item["Komoditi"] = data.comodity;
                    item["Jumlah Confirm"] = data.orderQty;
                    item["Tanggal Confirm"] = data.cancelConfirmDate ? moment(data.cancelConfirmDate).add(7, 'h').format("DD MMMM YYYY") : "";
                    item["Tanggal Pengiriman (Confirm)"] = data.deliveryDateConfirm ? moment(data.deliveryDateConfirm).add(7, 'h').format("DD MMMM YYYY") : "";
                    item["Keterangan"] = data.remark;
                 }

                 if(!item["Komoditi"]){
                     if(data.canceledBookingOrder>0 && (query.cancelState=='' || query.cancelState=='Cancel Sisa')){
                    
                        item["Tanggal Cancel"]=data.canceledDate ? moment(data.canceledDate).add(7, 'h').format("DD MMMM YYYY") : "";
                        item["Jumlah yang Dicancel"]=data.canceledBookingOrder;
                        item["Status Cancel"]="Cancel Sisa";
                     
                     } else if(data.expiredBookingOrder>0 && (query.cancelState== '' || query.cancelState=='Expired')){
                     
                        item["Tanggal Cancel"]=data.expiredDeletedDate ? moment(data.expiredDeletedDate).add(7, 'h').format("DD MMMM YYYY") : "";
                        item["Jumlah yang Dicancel"]=data.expiredBookingOrder;
                        item["Status Cancel"]="Expired";
                     
                     } 
                 } else if(item["Komoditi"]) {
                    item["Tanggal Cancel"]=data.cancelItemsDate ? moment(data.cancelItemsDate).add(7, 'h').format("DD MMMM YYYY") : "";
                    item["Jumlah yang Dicancel"]=data.orderQty;
                    item["Status Cancel"]="Cancel Confirm";
                 }

                 if (item["Tanggal Cancel"] || (data.canceledBookingOrder>0 || data.expiredBookingOrder>0)){
                     if(query.cancelState!=="Cancel Confirm"){
                         if(data.canceledBookingOrder>0 && data.canceledItems && (item["Kode Booking"]!==_temp2.code || !_temp2.code) && (item["Status Cancel"]!==_temp2.cancelState || !_temp2.cancelState) && query.cancelState!=="Expired"){ //&& _data.cancelState!=="Cancel Confirm"){  
                             _temp2.code=item["Kode Booking"];
                             _temp2.cancelState=item["Status Cancel"];
                             temporaryCancelSisa["Kode Booking"]=item["Kode Booking"];
                             temporaryCancelSisa["Tanggal Booking"] =item["Tanggal Booking"];
                             temporaryCancelSisa["Buyer"] = item["Buyer"];
                             temporaryCancelSisa["Jumlah Booking Order Awal"] = item["Jumlah Booking Order Awal"];
                             temporaryCancelSisa["Jumlah Booking Order Akhir"] = item["Jumlah Booking Order Akhir"]
                             temporaryCancelSisa["Tanggal Pengiriman (Booking)"] = item["Tanggal Pengiriman (Booking)"];
                             temporaryCancelSisa["Komoditi"] = "";
                             temporaryCancelSisa["Jumlah Confirm"] = "";
                             temporaryCancelSisa["Tanggal Confirm"] = "";
                             temporaryCancelSisa["Tanggal Pengiriman (Confirm)"] = "";
                             temporaryCancelSisa["Keterangan"] = "";
                             temporaryCancelSisa["Tanggal Cancel"]=data.canceledDate ? moment(data.canceledDate).add(7, 'h').format("DD MMMM YYYY") : "";
                             temporaryCancelSisa["Jumlah yang Dicancel"]=data.canceledBookingOrder;
                             temporaryCancelSisa["Status Cancel"]="Cancel Sisa";

                             row_span_count=1;
                             rowcount.row_count=row_span_count;
                             rowcount.code=item["Kode Booking"];
                             rowcount.cancelState=temporaryCancelSisa["Status Cancel"];

                             count++;
                             xls.data.push(temporaryCancelSisa);
                             this.rowspan.push(rowcount); 
                         } 
                         if(data.expiredBookingOrder>0 && data.canceledItems && (item["Kode Booking"]!==_temp3.code || !_temp3.code) && (item["Status Cancel"]!==_temp3.cancelState || !_temp3.cancelState)&& query.cancelState!=="Cancel Sisa"){ //&& _data.cancelState!=="Cancel Confirm"){
                             _temp3.code=item["Kode Booking"];
                             _temp3.cancelState=item["Status Cancel"];
                             temporaryExpired["Kode Booking"]=item["Kode Booking"];
                             temporaryExpired["Tanggal Booking"] =item["Tanggal Booking"];
                             temporaryExpired["Buyer"] = item["Buyer"];
                             temporaryExpired["Jumlah Booking Order Awal"] = item["Jumlah Booking Order Awal"];
                             temporaryExpired["Jumlah Booking Order Akhir"] = item["Jumlah Booking Order Akhir"]
                             temporaryExpired["Tanggal Pengiriman (Booking)"] = item["Tanggal Pengiriman (Booking)"];
                             temporaryExpired["Komoditi"] = "";
                             temporaryExpired["Jumlah Confirm"] = "";
                             temporaryExpired["Tanggal Confirm"] = "";
                             temporaryExpired["Tanggal Pengiriman (Confirm)"] = "";
                             temporaryExpired["Keterangan"] = "";
                             temporaryExpired["Tanggal Cancel"]=data.expiredDeletedDate ? moment(data.expiredDeletedDate).add(7, 'h').format("DD MMMM YYYY") : "";
                             temporaryExpired["Jumlah yang Dicancel"]=data.expiredBookingOrder;
                             temporaryExpired["Status Cancel"]="Expired";
                             count++;

                             row_span_count=1;
                             rowcount.row_count=row_span_count;
                             rowcount.code=item["Kode Booking"];
                             rowcount.cancelState=temporaryExpired["Status Cancel"];
                             xls.data.push(temporaryExpired);
                             this.rowspan.push(rowcount); 
                         }
                     }
                     if(_temp.code == item["Kode Booking"] && _temp.cancelState == item["Status Cancel"]){
                        item["Kode Booking"]='';
                        item["Tanggal Booking"]='';
                        item["Buyer"]='';
                        item["Jumlah Booking Order Akhir"]='';
                        item["Tanggal Pengiriman (Booking)"]='';
                        item["Jumlah Booking Order Awal"]='';
                        row_span_count=row_span_count+1;    
                     } else if((!_temp.code || _temp.code !== item["Kode Booking"]) ){
                         _temp.code = item["Kode Booking"];
                         _temp.cancelState = item["Status Cancel"];
                         row_span_count=1;
                     } else if(_temp.code==item["Kode Booking"] && _temp.cancelState!==item["Status Cancel"]){
                         _temp.code = item["Kode Booking"];
                         _temp.cancelState = item["Status Cancel"];
                         row_span_count=1;
                     }
                     
                     if(query.cancelState=="Cancel Sisa" || query.cancelState=="Expired"){
                        if(item["Status Cancel"] !== "Cancel Confirm"){
                            rowcount.row_count=row_span_count;
                            rowcount.code=data.bookingCode;
                            rowcount.cancelState=item["Status Cancel"];    
                            xls.data.push(item);
                            this.rowspan.push(rowcount);
                        }
                     } else {
                        rowcount.row_count=row_span_count;
                        rowcount.code=data.bookingCode;
                        rowcount.cancelState=item["Status Cancel"];    
                        xls.data.push(item);
                        this.rowspan.push(rowcount);
                         if (this.rowspan[count].row_count>1){
                             for(var x=rowcount.row_count;0<x;x--){
                                 if(this.rowspan[count].cancelState=="Cancel Confirm")
                                 {var z=count-x;
                                 
                                 this.rowspan[z+1].row_count=this.rowspan[count].row_count;}
                             }    
                         } 
                         count++;                           
                     }
                     xls.options.specification = {};
                     var fgColor = function(color){
                         return {
                             fgColor: {
                                 rgb: color
                             }
                         };
                     };
                     var border = {
                         top: { style: 'thin', color: 'FF000000' },
                         bottom: { style: 'thin', color: 'FF000000' },
                         left: { style: 'thin', color: 'FF000000' },
                         right: { style: 'thin', color: 'FF000000' },
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
                         cellUnit: {
                             
                             border: border,
                             alignment: {
                                 vertical: 'top'
                             },
                             
                         },
                         cellUnit_2: {
                             border: border,
                             alignment: {
                                 horizontal: 'right',
                                 vertical: 'top'
                             },
                             
                         },
                     };
 
                     for(var b of Object.keys(xls.data[0])){
                         
                         if(b=='Buyer' || b=='Jumlah Booking Order Awal' || b=='Jumlah Booking Order Akhir' || b=='Tanggal Pengiriman (Booking)' || b=='Tanggal Pengiriman (Confirm)' || b=='Tanggal Cancel'){
                             xls.options.specification[b] = {
                                 displayName: b,
                                 width: 250,
                                 headerStyle: styles.header,
                                 cellStyle: styles.cellUnit
                             };
                         } else {
                             xls.options.specification[b] = {
                                 displayName: b,
                                 width: 150,
                                 headerStyle: styles.header,
                                 cellStyle: styles.cellUnit
                             };
                         }
                     };

                    }
                }
                     xls.options.merges = [];
                     var d=0;
                     for(var a=0;a<xls.data.length;a++){
                         var c=1;
                         for(var b of Object.keys(xls.data[a])){
                             if(xls.data[a]["Kode Booking"]!=='' && (this.rowspan[d].row_count)>1 && (b!=="Komoditi" && b!=="Jumlah Confirm" && b!=="Tanggal Confirm" && b!=="Tanggal Pengiriman (Confirm)" && b!=="Keterangan" && b!=="Tanggal Cancel" && b!=="Jumlah yang Dicancel" && b!=="Status Cancel")){//&& xls.data[a].b && ){
                                if(xls.data[a]["Status Cancel"]=="Cancel Confirm"){ 
                                    xls.options.merges.push(
                                        { start: { row: a+2, column: c }, end: { row: (a+(this.rowspan[d].row_count)+1), column: c } }
                                    );
                                }
                             }
                             c++;
                         }
                         d++;
                     }
     
                 xls.options["Kode Booking"] = "string";
                 xls.options["Tanggal Booking"] = "string";
                 xls.options["Buyer"] = "string";
                 xls.options["Jumlah Booking Order Awal"] = "number";
                 xls.options["Jumlah Booking Order Akhir"] = "number";
                 xls.options["Tanggal Pengiriman (Booking)"] = "string";
                 xls.options["Komoditi"] = "string";
                 xls.options["Jumlah Confirm)"] = "number";
                 xls.options["Tanggal Confirm"] = "string";
                 xls.options["Tanggal Pengiriman (Confirm"] = "string";
                 xls.options["Keterangan"] = "string";
                 xls.options["Tanggal Cancel"] = "string";
                 xls.options["Jumlah yang Dicancel"] = "number";
                 xls.options["Status Cancel"] = "string";
     
                 if (query.dateFrom && query.dateTo) {
                     xls.name = `Canceled Booking Order ${moment(new Date(query.dateFrom)).add(7, 'h').format(dateFormat)} - ${moment(new Date(query.dateTo)).add(7, 'h').format(dateFormat)}.xlsx`;
                 }
                 else if (!query.dateFrom && query.dateTo) {
                     xls.name = `Canceled Booking Order ${moment(new Date(query.dateTo)).add(7, 'h').format(dateFormat)}.xlsx`;
                 }
                 else if (query.dateFrom && !query.dateTo) {
                     xls.name = `Canceled Booking Order ${moment(new Date(query.dateFrom)).add(7, 'h').format(dateFormat)}.xlsx`;
                 }
                 else
                     xls.name = `Canceled Booking Order Report.xlsx`;
     
                 resolve(xls);                    
                });
            }
}