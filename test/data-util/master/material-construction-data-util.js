"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class MaterialConstructionDataUtil {
    getSert(input) {
        var Manager = require("../../../src/managers/master/material-construction-manager");
        return _getSert(input, Manager, (data) => {
            return {
                name: data.name
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").master.MaterialConstruction;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `Name [${code}]`;
        data.remark = `remark [${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code : generateCode(),
            name: "MC/UAT/TEST",
            remark:"remark for UT"
        };
        return this.getSert(data);
    }
}

module.exports = new MaterialConstructionDataUtil();