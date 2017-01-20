"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class MachineTypeDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/machine-type-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").master.MachineType;
        var data = new Model();

        var code = generateCode();


        data.code = code;
        data.name = `Ordername [${code}]`;
        data.description = `decription [${code}]`;
        data.indicators = [{
            indicator: `Tekanan Press Mangle[${code}]`,
            dataType: "number",
            value: 10,
        },
            {
                indicator: `Tekanan Press Mangl[${code}]`,
                dataType: "string",
                value: "10",
            }];

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "machineType-UT-01",
            name: "machine flue",
            decription: "description",
            indicators: [
                {
                    indicator: "Tekanan Press Mangle",
                    dataType: "number",
                    value: 10,
                },
                {
                    indicator: "Tekanan Press Mangle",
                    dataType: "string",
                    value: "10",
                }
            ],

        };
        return this.getSert(data);
    }
}

module.exports = new MachineTypeDataUtil();