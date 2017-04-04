"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class DesignMotiveDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/design-motive-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.DesignMotive;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `motive[${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT/motive/01",
            name: "motive001"
        };
        return this.getSert(data);
    }
}
module.exports = new DesignMotiveDataUtil();
