"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class QualityDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/quality-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code,
                name: data.name
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.Quality;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `Quality[${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT/QUALITY/01",
            name: "QualityTest"
        };
        return this.getSert(data);
    }
}
module.exports = new QualityDataUtil();
