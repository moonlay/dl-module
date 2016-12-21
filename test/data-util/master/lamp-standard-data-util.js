"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class LampStandardDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/lamp-standard-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                name: data.name
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.LampStandard;
        var data = new Model();

        var code = generateCode();

        data.name = `name[${code}]`;
        data.description = `description[${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            name: 'Lamp Standard Unit Test',
            description: 'Lamp'
        };
        return this.getSert(data);
    }
}
module.exports = new LampStandardDataUtil();