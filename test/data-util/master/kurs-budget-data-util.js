"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class kursBudgetDataUtil {

    getNewDataTest() {
        var datas = [];

        var data = [
            ["Mata Uang", "Kurs"],
            ["TEST", "9"],
            ["test2", "1"],
            ["test3", "2"],
        ];

        return Promise.resolve(data);
    }

    getSert(input) {
        var ManagerType = require("../../../src/managers/master/kurs-budget-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").master.KursBudget;
        var data = new Model();

        var code = generateCode();

        data.code = "testKursBudget";
        data.date = new Date();
        data.rate = 1;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UTT",
            date: new Date(),
            rate: 1,
            description: "Unit test kurs budget"
        };
        return this.getSert(data);
    }

}
module.exports = new kursBudgetDataUtil();

