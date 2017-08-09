"use strict";
var _getSert = require("../getsert");
var processTypeDataUtil = require("./process-type-data-util");
var generateCode = require("../../../src/utils/code-generator");

class DurationEstimationUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/fp-duration-estimation-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                name: data.name
            };
        });
    }

    getNewData() {
        return processTypeDataUtil.getNewData()
            .then((processType) => {
                return processTypeDataUtil.getSert(processType)
                    .then((results) => {
                        var _processType = results;

                        var code = generateCode();

                        var areas = [{ "name": "PPIC", "duration": 2 }, { "name": "PRE TREATMENT", "duration": 4 }];

                        var data = {
                            code: code,
                            processType: _processType,
                            processTypeId: _processType._id,
                            areas: areas
                        };
                        return Promise.resolve(data);
                    });
            })
    }

    getTestData() {
        return Promise.all([processTypeDataUtil.getTestData()])
            .then((results) => {
                var _processType = results[0];

                var code = "UT/FP-DURATION-ESTIMATION/01";

                var areas = [{ "name": "PPIC", "duration": 2 }, { "name": "PRE TREATMENT", "duration": 4 }];

                var data = {
                    code: code,
                    processType: _processType,
                    processTypeId: _processType._id,
                    areas: areas
                };
                return this.getSert(data);
            });
    }
}

module.exports = new DurationEstimationUtil();