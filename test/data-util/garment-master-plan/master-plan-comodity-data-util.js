"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class MasterPlanComodityDataUtil {
    getSert(input) {
        var Manager = require("../../../src/managers/garment-master-plan/master-plan-comodity-manager");
        return _getSert(input, Manager, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").garmentMasterPlan.MasterPlanComodity;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `name [${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT/MP/Comodity/01",
            name: "MP Comodity UT"
        };
        return this.getSert(data);
    }

    getTestData2() {
        var data = {
            code: "UT/MP/Comodity/02",
            name: "MP Comodity UT 2"
        };
        return this.getSert(data);
    }
}
module.exports = new MasterPlanComodityDataUtil();