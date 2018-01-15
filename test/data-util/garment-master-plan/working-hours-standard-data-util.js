"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class QualityDataUtil {
    getSert(input) {
        var Manager = require("../../../src/managers/garment-master-plan/working-hours-standard-manager");
        return _getSert(input, Manager, (data) => {
            return {
                code: data.code,
                color: data.color
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").garmentMasterPlan.WorkingHoursStandard;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.color = `#[${code}]`;
        data.start=0;
        data.end=10;
        data.remark=`Remark[${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT/WHS/01",
            color: "#ffffff",
            start:100,
            end:1000,
            remark: "unit test"
        };
        return this.getSert(data);
    }
}
module.exports = new QualityDataUtil();
