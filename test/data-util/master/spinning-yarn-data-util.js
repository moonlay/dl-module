"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class SpinningYarnDataUtil {
    getSert(input) {
        var Manager = require("../../../src/managers/master/spinning-yarn-manager");
        return _getSert(input, Manager, (data) => {
            return {
                name: data.name,
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").master.YarnMaterial;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `Yarn [${code}]`;
        data.ne = 120;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code : generateCode(),
            name: "YARN/UAT/TEST",
            ne:10
        };
        return this.getSert(data);
    }
}

module.exports = new SpinningYarnDataUtil();