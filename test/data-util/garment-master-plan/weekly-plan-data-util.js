"use strict";
var helper = require("../../helper");
var WeeklyPlanManager = require("../../../src/managers/garment-master-plan/weekly-plan-manager");
var UnitDataUtil = require("../master/unit-data-util");
var moment = require("moment");
var _getSert = require("../getsert");

class WeeklyPlanDataUtil {
    getNewData() {
       return Promise.all([UnitDataUtil.getTestData()])
            .then((results) => {
                var _unit = results[0];    
                var items = [];
                for (var i = 1; i <= 52; i++) {
                    var startDate = moment().year(2018).day("Monday").week(i).toDate();
                    var endDate = moment().year(2018).day("Friday").week(i).toDate();
                    items.push({
                        weekNumber: i,
                        startDate: startDate,
                        endDate: endDate,
                        month: startDate.getMonth(),
                        efficiency : 10,
                        operator : 100,
                        workingHours : 40,
                    })
                }
                var data = {
                    year: new Date().getFullYear() + 1,
                    unitId:_unit._id,
                    unit:_unit,
                    items: items
                };
                return Promise.resolve(data);
            });
    }

    getNewTestData() {
        return helper
            .getManager(WeeklyPlanManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }

    getSert(input) {
        var Manager = require("../../../src/managers/garment-master-plan/weekly-plan-manager");
        return _getSert(input, Manager, (data) => {
            return {
                year: data.year,
                unitId: data.unitId
            };
        });

    }
    
    getTestData(){
        return Promise.all([UnitDataUtil.getTestData()])
            .then((results) => {
                var _unit = results[0];    
                var items = [];
                for (var i = 1; i <= 52; i++) {
                    var startDate = moment().year(2018).day("Monday").week(i).toDate();
                    var endDate = moment().year(2018).day("Friday").week(i).toDate();
                    items.push({
                        weekNumber: i,
                        startDate: startDate,
                        endDate: endDate,
                        month: startDate.getMonth(),
                        efficiency : 10,
                        operator : 100,
                        workingHours : 40,
                    })
                }
                var data = {
                    year: new Date().getFullYear() + 1,
                    unitId:_unit._id,
                    unit:_unit,
                    items: items
                };
                return this.getSert(data);
            });
    }
}

module.exports = new WeeklyPlanDataUtil();
