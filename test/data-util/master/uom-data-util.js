"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class UomDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/uom-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                unit: data.unit
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").master.Uom;
        var data = new Model();

        var code = generateCode();

        data.unit = code;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            unit: "PCS"
        };
        return this.getSert(data);
    }
    
    getSecondTestData() {
        var data = {
            unit: "MTR"
        };
        return this.getSert(data);
    }

    getThirdTestData() {
        var data = {
            unit: "ROLL"
        };
        return this.getSert(data);
    }

    getFourthTestData() {
        var data = {
            unit: "YDS"
        };
        return this.getSert(data);
    }

    getFifthTestData() {
        var data = {
            unit: "KG"
        };
        return this.getSert(data);
    }

    getSixthTestData() {
        var data = {
            unit: "KM"
        };
        return this.getSert(data);
    }
}

module.exports = new UomDataUtil();
