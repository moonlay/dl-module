"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class StyleDataUtil {
    getSert(input) {
        var Manager = require("../../../src/managers/garment-master-plan/style-manager");
        return _getSert(input, Manager, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").garmentMasterPlan.Style;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `name [${code}]`;
        data.description=`description [${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT/Style/01",
            name: "Style UT",
            description: "unit test"
        };
        return this.getSert(data);
    }
}
module.exports = new StyleDataUtil();