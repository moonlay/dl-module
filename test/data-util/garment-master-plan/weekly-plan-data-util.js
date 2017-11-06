"use strict";
var helper = require("../../helper");
var WeeklyPlanManager = require("../../../src/managers/garment-master-plan/weekly-plan-manager");
var moment = require("moment");

class WeeklyPlanDataUtil {
    getNewData() {
        var items = [];
        for (var i = 1; i <= 52; i++) {
            var startDate = moment().year(2018).day("Monday").week(i).toDate();
            var endDate = moment().year(2018).day("Friday").week(i).toDate();
            items.push({
                weekNumber: i,
                startDate: startDate,
                endDate: endDate,
                month: startDate.getMonth()
            })
        }
        var data = {
            year: new Date().getFullYear() + 1,
            items: items
        };
        return Promise.resolve(data);
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
}

module.exports = new WeeklyPlanDataUtil();
