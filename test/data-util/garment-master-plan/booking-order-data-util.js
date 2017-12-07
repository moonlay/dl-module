"use strict";
var helper = require("../../helper");
var _getSert = require("../getsert");
var BookingOrderManager = require("../../../src/managers/garment-master-plan/booking-order-manager");

var generateCode = require("../../../src/utils/code-generator");
var Style = require("./style-data-util");
var sh = require("./standard-hour-data-util");
var weeklyPlan = require("./weekly-plan-data-util");
var UnitDataUtil = require("../master/unit-data-util");
var Buyer = require("../master/garment-buyer-data-util");

var Models = require("dl-models");
var Map = Models.map;

class BookingOrderDataUtil {
    getNewData() {
       return Promise.all([ weeklyPlan.getTestData(),sh.getTestData(),Buyer.getTestData()])
            .then((results) => {
                var _week = results[0];
                var _sh = results[1];
                // // var _unit = results[2];
                var _buyer = results[2];
                var _style = _sh.style;
                var date = new Date();
                var targetDate=new Date();
                var deliveryDate=new Date(targetDate.setDate(targetDate.getDate() + 10));
            
                var code = generateCode();
                var data = {
                    code : code,
                    styleId : _style._id,
                    style : _style,
                    bookingDate : date,
                    deliveryDate : deliveryDate,
                    orderQuantity: 1000,
                    garmentBuyerId : _buyer._id,
                    standardHourId: _sh._id,
                    standardHour: _sh,
                    details:[{
                            unitId: _week.unit._id,
                            weeklyPlanId: _week._id,
                            quantity: 500,
                            week: _week.items[0]
                        },
                        {
                            unitId: _week.unit._id,
                            weeklyPlanId: _week._id,
                            quantity: 500,
                            week: _week.items[1]
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
}
module.exports = new BookingOrderDataUtil();