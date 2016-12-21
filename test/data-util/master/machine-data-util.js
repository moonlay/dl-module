"use strict";
var _getSert = require("../getsert");
var unit = require("./unit-data-util");
var ObjectId   = require("mongodb").ObjectId;
var generateCode = require("../../../src/utils/code-generator");

class MachineDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/machine-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                _id: data._id
            };
        });
    }

    getNewData() {
        return unit.getTestData()
            .then(unit => {

                var now = new Date();
                var code = generateCode();

                var data = {
                    name: `name [${code}]`,
                    unitId: unit._id,
                    unit: unit,
                    process: `process [${code}]`,
                    manufacture: `manufacture [${code}]`,
                    year: now.getFullYear(),
                    condition: `condition [${code}]`
                };
                return Promise.resolve(data);
            });
    }

    getTestData() {
        return unit.getTestData()
            .then(unit => {
                var data = {
                    _id:new ObjectId("584797d3bd4e12234869bccb"), 
                    name: "Test Machine",
                    unitId: unit._id,
                    unit: unit,
                    process: "Process untuk unit test",
                    manufacture: "Manufacture untuk unit test",
                    year:1900,
                    condition: ""
                };
                return this.getSert(data);
            });
    }
}
module.exports = new MachineDataUtil();
