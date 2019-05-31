"use strict";
var helper = require("../../helper");
var _getSert = require("../getsert");
var SewingBlockingPlanManager = require("../../../src/managers/garment-master-plan/sewing-blocking-plan-manager");

var generateCode = require("../../../src/utils/code-generator");
var BookingOrder = require("./booking-order-data-util");
var WeeklyPlan = require("./weekly-plan-data-util");

var Models = require("dl-models");
var Map = Models.map;

class SewingBlockingPlanDataUtil {
    getNewData() {
       return Promise.all([BookingOrder.getNewTestData(), WeeklyPlan.getTestData()])
            .then((results) => {
                var _bookingOrder = results[0];
                var _weeklyPlan = results[1];
                var code = generateCode();

                var details = [];
                var numItem = 9;
                for(var bookingDetail of _bookingOrder.items){
                    numItem += 1;
                    var detail = {
                        code : bookingDetail.code,
                        shSewing : 20,
                        unitId : _weeklyPlan.unitId.toString(),
                        unit : _weeklyPlan.unit,
                        weeklyPlanId : _weeklyPlan._id.toString(),
                        weeklyPlanYear : _weeklyPlan.year,
                        week : _weeklyPlan.items[numItem],
                        masterPlanComodityId : bookingDetail.masterPlanComodityId.toString(),
                        masterPlanComodity : bookingDetail.masterPlanComodity,
                        quantity : bookingDetail.quantity,
                        remark : `remark ${bookingDetail.code}`,
                        isConfirmed : true,
                        deliveryDate : _bookingOrder.deliveryDate,
                        efficiency:52,
                        ehBooking:500
                    }
                    details.push(detail);
                }

                var data = {
                    code : code,
                    bookingOrderNo : _bookingOrder.code,
                    bookingOrderId : _bookingOrder._id.toString(),
                    garmentBuyerId : _bookingOrder.garmentBuyerId.toString(),
                    garmentBuyerName : _bookingOrder.garmentBuyerName,
                    garmentBuyerCode : _bookingOrder.garmentBuyerCode,
                    quantity : _bookingOrder.orderQuantity,
                    bookingDate : `${(new Date(_bookingOrder.bookingDate)).getFullYear()}-${((new Date(_bookingOrder.bookingDate)).getMonth() + 1)}-${(new Date(_bookingOrder.bookingDate)).getDate()}`,
                    deliveryDate : `${(new Date(_bookingOrder.deliveryDate)).getFullYear()}-${((new Date(_bookingOrder.deliveryDate)).getMonth() + 1)}-${(new Date(_bookingOrder.deliveryDate)).getDate()}`,
                    remark: _bookingOrder.remark,
                    bookingItems:_bookingOrder.items,
                    details : details
                }

                return Promise.resolve(data);
            });
    }

    getNewTestData() {
        return helper
            .getManager(SewingBlockingPlanManager)
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
module.exports = new SewingBlockingPlanDataUtil();