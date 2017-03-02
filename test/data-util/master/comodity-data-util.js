"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class ComodityDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/comodity-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code,
                name: data.name
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.Comodity;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `Comodity[${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT/COMODITY/01",
            name: "100 % COTTON FABRIC"
        };
        return this.getSert(data);
    }
}
module.exports = new ComodityDataUtil();
