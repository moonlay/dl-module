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
var moment = require('moment');

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
                // if(!_buyer)
                //     errors["buyer"] = i18n.__("BookingOrder.buyer.isNotFound:%s is not found", i18n.__("BookingOrder.buyer._:Buyer"));

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
                if(valid.items){
                    var totalqty = 0;
                    for (var i of valid.items) {
                        totalqty += i.quantity;
                    }
                    if (valid.orderQuantity < totalqty) {
                        errors["orderQuantity"] = i18n.__("BookingOrder.orderQuantity.shouldNot:%s should equal or more than SUM quantity in items", i18n.__("BookingOrder.orderQuantity._:OrderQuantity")); 
                        errors["totalQuantity"]= i18n.__("BookingOrder.totalQuantity.shouldNot:%s should equal or less than booking order quantity", i18n.__("BookingOrder.totalQuantity._:TotalQuantity")); 
                    }
                }

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
                                if(item._createdDate!='' && item._createdDate){
                                    today=new Date(item._createdDate);
                                }
                                valid.deliveryDate=new Date(valid.deliveryDate);
                                valid.bookingDate= new Date(valid.bookingDate);
                                if(today>item.deliveryDate){
                                    itemError["deliveryDate"] = i18n.__("BookingOrder.items.deliveryDate.shouldNot:%s should not be less than today date", i18n.__("BookingOrder.items.deliveryDate._:DeliveryDate")); 
                                }
                                else if (valid.deliveryDate<item.deliveryDate){
                                    itemError["deliveryDate"] = i18n.__("BookingOrder.items.deliveryDate.shouldNot:%s should not be more than booking deliveryDate", i18n.__("BookingOrder.items.deliveryDate._:DeliveryDate"));                                 
                                }
                                else if(valid.bookingDate>item.deliveryDate){
                                    itemError["deliveryDate"] = i18n.__("BookingOrder.items.deliveryDates.shouldNot:%s should not be less than booking date", i18n.__("BookingOrder.items.deliveryDate._:DeliveryDate"));
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
                    else 
                        errors["detail"] = i18n.__("BookingOrder.detail.mustHaveItem:%s must have at least 1 item", i18n.__("BookingOrder.detail._:Detail"));
                
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

    delete(data) {
        data._deleted = true;
        return this.masterPlanCollection.singleOrDefault({ "bookingOrderNo": data.code,"_deleted":false })
                   .then(masterPlan =>{
                       if(masterPlan){
                        masterPlan.status="Booking Dihapus";
                        return this.masterPlanCollection.update(masterPlan)
                                   .then(idMasterPlan=>{
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
            
            var dateQuery={};
            if (query.dateFrom !== undefined && query.dateFrom !== "" && query.dateTo !== undefined  && query.dateTo !== "")
            {
                var dateFrom = new Date(query.dateFrom);
                var dateTo = new Date(query.dateTo);
                dateFrom.setHours(dateFrom.getHours() - offset);
                dateTo.setHours(dateTo.getHours() - offset);

                dateQuery = {
                    "bookingDate": {
                        "$gte": dateFrom,
                        "$lte": dateTo
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

            var comodityQuery = {};
            if (query.comodity) {
                comodityQuery = {
                    "comodity": query.comodity
                };
            }

            var confirmStateQuery = {};
            if (query.confirmState === "Sudah DiKonfirmasi") {
                confirmStateQuery = {
                    "deliveryDateConfirm":{$ne:"" }
                }
            }else  if (query.confirmState === "Belum DiKonfirmasi") 
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
                    "isMasterPlan": true
                }
            }else  if (query.bookingOrderState === "Booking") {
                bookingOrderStateQuery = {
                    "isMasterPlan": false ,
                    "isCanceled":false
                }
            }

             var Query = { "$and": [ dateQuery, deletedQuery, buyerQuery, comodityQuery, confirmStateQuery, bookingOrderStateQuery, codeQuery] };
            this.collection
                .aggregate( [
                    { "$unwind": {path: "$items", preserveNullAndEmptyArrays: true} },
                    {
                        "$project": {
                            "bookingCode": "$code",
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
                            "_deleted":"$_deleted"
                        }
                    },
                    { "$match": Query },
                    {
                        "$sort": {
                            "_createdDate": 1,
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
            this.temp=[];
            var temps={};
            var dateFormat = "DD/MM/YYYY";

            
            for (var pr of dataReport.data) {
                temps.bookingCode=pr.bookingCode;
                temps.orderQty=pr.orderQty;
                this.temp.push(temps);
            }
            for (var data of dataReport.data) {
                var item = {};
                var item = {};
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
                    bookingOrderState="Sudah Dibuat MasterPlan";   
                }else if(data.isMasterPlan == false && data.isCanceled==false)
                {
                    bookingOrderState="Booking";
                }
               
                item["Kode Booking"] = data.bookingCode;
                item["Tanggal Booking"] = data.bookingDate ? moment(new Date(data.bookingDate)).add(7, 'h').format(dateFormat) : '';
                item["Buyer"] = data.buyer ? data.buyer : '';
                item["Jumlah Order"] = data.totalOrderQty ? data.totalOrderQty : '';
                item["Tanggal Pengiriman (Booking)"]= data.deliveryDateBooking && data.deliveryDateBooking !="" ? moment(data.deliveryDateBooking ).format(dateFormat) : '';
                item["Komoditi"]=data.comodity ? data.comodity : '';
                item["Jumlah Confirm"] = data.orderQty ? data.orderQty : '';
                item["Tanggal Pengiriman(Confirm)"] = data.deliveryDateConfirm && data.deliveryDateConfirm !="" ? moment(new Date(data.deliveryDateConfirm)).add(7, 'h').format(dateFormat) : '';
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
                    remain=0;
                xls.data.push(item);

            }

            xls.options["Kode Booking"] = "string";
            xls.options["Tanggal Booking"] = "string";
            xls.options["Buyer"] = "string";
            xls.options["Jumlah Order"] = "string";
            xls.options["Tanggal Pengiriman(Booking)"] = "string";
            xls.options["Komoditi"] = "string";
            xls.options["Tanggal Pengiriman(Confirm)"] = "string";
            xls.options["Keterangan"] = "string";
            xls.options["Status Confirm"] = "string";
            xls.options["Status Booking Order"] = "string";
            xls.options["Sisa Order(Belum Confirm)"] = "string";

            if (query.dateFrom && query.dateTo) {
                xls.name = `Booking Order ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (!query.dateFrom && query.dateTo) {
                xls.name = `Booking Order ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (query.dateFrom && !query.dateTo) {
                xls.name = `Booking Order ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
            }
            else
                xls.name = `Booking Order Report.xlsx`;

            resolve(xls);
        });
    }

}