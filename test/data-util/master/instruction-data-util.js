"use strict";
var _getSert = require("../getsert");
var stepDataUtil = require("./step-data-util");
var generateCode = require("../../../src/utils/code-generator");

class InstructionDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/instruction-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                name: data.name
            };
        });
    }

    getNewData() {
        return Promise.all([stepDataUtil.getTestData()])
            .then((results) => {
                var _step = results[0];

                var code = generateCode();

                var data = {
                    code: code,
                    name: code,
                    steps: [_step]
                };
                return Promise.resolve(data);
            });
    }

    getTestData() {
        return Promise.all([stepDataUtil.getTestData()])
            .then((results) => {
                var _step = results[0];

                var code = generateCode();

                var dataReturn = {
                    name: "Unit Test",
                    code: code,
                    steps: [_step]
                };
                return this.getSert(dataReturn);
            });
    }

    getNewDataItems() {
        return Promise.all([stepDataUtil.getTestData()])
            .then((results) => {
                var _step = results[0];

                var code = generateCode();

                var data = {
                    code: code,
                    name: code,
                    steps: []
                };
                return Promise.resolve(data);
            });
    }
}

module.exports = new InstructionDataUtil();