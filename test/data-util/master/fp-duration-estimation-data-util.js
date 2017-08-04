"use strict";
var _getSert = require("../getsert");
var processTypeDataUtil = require("./process-type-data-util");

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
        return Promise.all([processTypeDataUtil.getTestData()])
            .then((results) => {
                var _processType = results[0];

                var areas = [{ "name": "PPIC", "duration": 2 }, { "name": "PRE TREATMENT", "duration": 4 }];

                var data = {
                    processType: _processType,
                    processTypeId: _processType._id,
                    areas: areas
                };
                return Promise.resolve(data);
            });
    }

    getTestData() {
        return Promise.all([processTypeDataUtil.getTestData()])
            .then((results) => {
                var _processType = results[0];

                var areas = [{ "name": "PPIC", "duration": 2 }, { "name": "PRE TREATMENT", "duration": 4 }];

                var data = {
                    processType: _processType,
                    processTypeId: _processType._id,
                    areas: areas
                };
                return this.getSert(data);
            });
    }
}

module.exports = new DurationEstimationUtil();