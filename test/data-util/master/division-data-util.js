"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class DivisionDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/division-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.Division;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `name[${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: 'UT/DIV/01',
            name: 'Div Unit Test',
            description: ''
        };
        return this.getSert(data);
    }

    getTestGarmentData() {
        var data = {
            code: 'UT/DIV/GMT/01',
            name: 'GARMENT',
            description: ''
        };
        return this.getSert(data);
    }
}
module.exports = new DivisionDataUtil();
