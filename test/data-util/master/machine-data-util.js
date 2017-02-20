"use strict";
var _getSert = require("../getsert");
var unit = require("./unit-data-util");
var ObjectId = require("mongodb").ObjectId;
var generateCode = require("../../../src/utils/code-generator");
var unitTypeData = require("./unit-data-util");
var stepTypeData = require("./step-data-util");
var machineTypeData = require("./machine-type-data-util");
var machineEventData = require("./machine-event-data-util");
var machineTypeData = require("./machine-type-data-util");

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
        return Promise.all([unitTypeData.getTestData(), stepTypeData.getTestData(), machineEventData.getTestData(), machineEventData.getTestData2(), machineTypeData.getNewTestData()])
            .then(results => {
                var _unit = results[0];
                var _step = results[1];
                var _machineEvent1 = results[2];
                var _machineEvent2 = results[3];
                var _machineType = results[4];
                var now = new Date();
                var code = generateCode();

                var data = {
                    code: code,
                    name: `name [${code}]`,
                    unitId: _unit._id,
                    unit: _unit,
                    stepId: _step._id,
                    step: _step,
                    process: `process [${code}]`,
                    manufacture: `manufacture [${code}]`,
                    year: now.getFullYear(),
                    condition: `condition [${code}]`,
                    machineTypeId: _machineType._id,
                    machineType: _machineType,
                    machineEvents: [{
                        code: _machineEvent1.code,
                        no: _machineEvent1.no,
                        name: _machineEvent1.name,
                    }, {
                            code: _machineEvent2.code,
                            no: _machineEvent2.no,
                            name: _machineEvent2.name,
                        }],
                    machineTypeId: _machineType._id,
                    machineType: _machineType,

                };
                return Promise.resolve(data);
            });
    }

    getTestData() {
        return Promise.all([unitTypeData.getTestData(), stepTypeData.getTestData(), machineTypeData.getNewTestData()])
            .then(results => {
                var _unit = results[0];
                var _step = results[1];
                var _machineType = results[2];
                var data = {
                    code: "MCH/TEST/2016",
                    name: "Test Machine",
                    unitId: _unit._id,
                    unit: _unit,
                    stepId: _step._id,
                    step: _step,
                    process: "Process untuk unit test",
                    manufacture: "Manufacture untuk unit test",
                    year: 1900,
                    condition: "Baik",
                    machineTypeId: _machineType._id,
                    machineType: _machineType,
                    machineEvents: [{
                        code: 'unitTestCode01',
                        no: '1',
                        name: 'unitTestName1',
                    }, {
                            code: 'unitTestCode02',
                            no: '2',
                            name: 'unitTestName2',
                        }],
                    machineTypeId: _machineType._id,
                    machineType: _machineType,

                };
                return this.getSert(data);
            });
    }
}
module.exports = new MachineDataUtil();
