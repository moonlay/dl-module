"use strict";
var helper = require("../../helper");
var _getSert = require("../getsert");
var BookingOrderManager = require("../../../src/managers/garment-master-plan/booking-order-manager");

var generateCode = require("../../../src/utils/code-generator");
var Comodity = require("./master-plan-comodity-data-util");
var Buyer = require("../master/garment-buyer-data-util");
var Section = require("../garment-master-plan/garment-section-data-util");

var Models = require("dl-models");
var Map = Models.map;

class BookingOrderDataUtil {
    getNewData() {
       return Promise.all([ Buyer.getTestData(),Section.getTestData(),Comodity.getTestData(),Comodity.getTestData2()])
            .then((results) => {
                var _buyer = results[0];
                var _section = results[1];
                var _comodity = results[2];
                var _comodity2 = results[3];
                var date = new Date();
                var targetDate=new Date();
                var deliveryDate=new Date(targetDate.setDate(targetDate.getDate() + 46));
            
                var code = generateCode();
                var data = {
                    code : code,
                    bookingDate : date,
                    deliveryDate : deliveryDate,
                    orderQuantity: 1000,
                    garmentBuyerId : _buyer._id,
                    garmentSectionId : _section._id,
                    items:[{
                            masterPlanComodity:_comodity,
                            masterPlanComodityId:_comodity._id,
                            quantity: 500,
                            deliveryDate : deliveryDate
                        },
                        {
                            masterPlanComodity:_comodity2,
                            masterPlanComodityId:_comodity2._id,
                            quantity: 500,
                            deliveryDate : deliveryDate
                        }
                    ]

                }

                return Promise.resolve(data);
            });
    }
    getReportData() {
        return Promise.all([ Buyer.getTestData(),Comodity.getTestData(),Comodity.getTestData2()])
             .then((results) => {
                 var _buyer = results[0];
                 var _comodity = results[1];
                 var _comodity2 = results[2];
                 var date = new Date("2018-01-05");
                 var targetDate=new Date();
                 var deliveryDate=new Date(targetDate.setDate(targetDate.getDate() + 10));
             
                 var code = generateCode();
                 var data = {
                     code : code,
                     bookingDate : date,
                     deliveryDate : deliveryDate,
                     orderQuantity: 1000,
                     _deleted : false,
                     garmentBuyerId : _buyer._id,
                     items:[{
                             masterPlanComodity:_comodity,
                             masterPlanComodityId:_comodity._id,
                             quantity: 500,
                             deliveryDate : deliveryDate
                         },
                         {
                             masterPlanComodity:_comodity2,
                             masterPlanComodityId:_comodity2._id,
                             quantity: 500,
                             deliveryDate : deliveryDate
                         }
                     ]
 
                 }
 
                 return Promise.resolve(data);
             });
     }
    getNewTestData() {
        return helper
            .getManager(BookingOrderManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }
    getNewTestDataEmptyItems() {
        return helper
            .getManager(BookingOrderManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    data.items = [];
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }
}
module.exports = new BookingOrderDataUtil();