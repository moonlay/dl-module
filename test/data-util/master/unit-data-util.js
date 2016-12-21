"use strict";
var _getSert = require("../getsert");
var division = require("./division-data-util");
var generateCode = require("../../../src/utils/code-generator");

class UnitDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/unit-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        return division.getTestData()
            .then(div => {

                var code = generateCode();

                var data = {
                    code: code,
                    divisionId: div._id,
                    division: div,
                    name: `name[${code}]`,
                    description: ""
                };
                return Promise.resolve(data);
            });
    }

    getTestData() {
        return division.getTestData()
            .then(div => {
                var data = {
                    code: "UT/UNIT/01",
                    divisionId: div._id,
                    division: div,
                    name: "Test Unit",
                    description: ""
                };
                return this.getSert(data);
            });
    }
}
module.exports = new UnitDataUtil();
