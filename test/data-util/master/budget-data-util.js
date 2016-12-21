"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class BudgetDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/budget-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.Budget;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `name[${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT/BUDGET/01",
            name: "data 01"
        };
        return this.getSert(data);
    }
}
module.exports = new BudgetDataUtil();
