"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class GarmentSectionDataUtil {
    getSert(input) {
        var Manager = require("../../../src/managers/garment-master-plan/garment-section-manager");
        return _getSert(input, Manager, (data) => {
            return {
                code: data.code,
                name: data.name,
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").garmentMasterPlan.GarmentSection;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `name [${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "A",
            name: "Alpha"
        };
        return this.getSert(data);
    }

    getTestData2() {
        var data = {
            code: "B",
            name: "Beta"
        };
        return this.getSert(data);
    }
}
module.exports = new GarmentSectionDataUtil();