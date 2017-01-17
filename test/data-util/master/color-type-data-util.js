"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class ColorTypeDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/color-type-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").master.ColorType;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `Shade [${code}]`;
        data.remark = `remark [${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code : "ORDTP-UT-01",
            name: "LIGHT",
            remark:"remark for UT"
        };
        return this.getSert(data);
    }

    getTestData2() {
        var data = {
            code : "ORDTP-UT-02",
            name: "DARK",
            remark:"remark for UT2"
        };
        return this.getSert(data);
    }
}

module.exports = new ColorTypeDataUtil();
