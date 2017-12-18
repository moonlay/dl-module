"use strict";
var helper = require("../../helper");
var _getSert = require("../getsert");
var MasterPlanManager = require("../../../src/managers/garment-master-plan/master-plan-manager");

var generateCode = require("../../../src/utils/code-generator");
var BookingOrder = require("./booking-order-data-util");
var WeeklyPlan = require("./weekly-plan-data-util");

var Models = require("dl-models");
var Map = Models.map;

class MasterPlanDataUtil {
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
                        masterPlanComodityId : bookingDetail.masterPlanComodityId.toString(),
                        masterPlanComodity : bookingDetail.masterPlanComodity,
                        quantity : bookingDetail.quantity,
                        remark : bookingDetail.remark,
                        isConfirmed : bookingDetail.isConfirmed,
                        detailItems : [
                            {
                                shCutting : 20,
                                shSewing : 20,
                                shFinishing : 20,
                                unitId : _weeklyPlan.unitId.toString(),
                                unit : _weeklyPlan.unit,
                                weeklyPlanId : _weeklyPlan._id.toString(),
                                weeklyPlanYear : _weeklyPlan.year,
                                week : _weeklyPlan.items[numItem],
                                quantity : 250,
                                remark : `${bookingDetail.masterPlanComodity.name} remark 1`
                            },{
                                shCutting : 20,
                                shSewing : 20,
                                shFinishing : 20,
                                unitId : _weeklyPlan.unitId.toString(),
                                unit : _weeklyPlan.unit,
                                weeklyPlanId : _weeklyPlan._id.toString(),
                                weeklyPlanYear : _weeklyPlan.year,
                                week : _weeklyPlan.items[numItem + 1],
                                quantity : 250,
                                remark : `${bookingDetail.masterPlanComodity.name} remark 2`
                            }
                        ]
                    }
                    numItem += 1;
                    details.push(detail);
                }

                var data = {
                    code : code,
                    bookingOrderNo : _bookingOrder.code,
                    bookingOrderId : _bookingOrder._id.toString(),
                    garmentBuyerId : _bookingOrder.garmentBuyerId.toString(),
                    garmentBuyerName : _bookingOrder.garmentBuyerName,
                    garmentBuyerCode : _bookingOrder.garmentBuyerCode,
                    quantity : _bookingOrder.quantity,
                    bookingDate : `${(new Date(_bookingOrder.bookingDate)).getFullYear()}-${((new Date(_bookingOrder.bookingDate)).getMonth() + 1)}-${(new Date(_bookingOrder.bookingDate)).getDate()}`,
                    deliveryDate : `${(new Date(_bookingOrder.deliveryDate)).getFullYear()}-${((new Date(_bookingOrder.deliveryDate)).getMonth() + 1)}-${(new Date(_bookingOrder.deliveryDate)).getDate()}`,
                    remark: _bookingOrder.remark,
                    details : details
                }

                return Promise.resolve(data);
            });
    }

    getNewTestData() {
        return helper
            .getManager(MasterPlanManager)
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
module.exports = new MasterPlanDataUtil();