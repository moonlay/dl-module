"use strict";
var _getSert = require("../getsert");
var helper = require("../../helper");
var generateCode = require("../../../src/utils/code-generator");
var ObjectId = require("mongodb").ObjectId;
var machineType = require("../../../src/managers/master/machine-type-manager");

class MachineTypeDataUtil {
    getNewData() {
        var Model = require("dl-models").master.MachineType;
        var data = new Model();

        var code = generateCode();


        data.code = code;
        data.name = `Ordername [${code}]`;
        data.description = `decription [${code}]`;
        data.indicators =
            [{
                indicator: `Tekanan Press Mangle[${code}]`,
                dataType: "input angka",
                defaultValue: 10,
                uom: "a",
            },
                {
                    indicator: `Tekanan Press Mangl[${code}]`,
                    dataType: "input teks",
                    defaultValue: "10",
                    uom: "a",
                }, {
                    indicator: `range`,
                    dataType: "input skala angka",
                    defaultValue: "1-10",
                    uom: "a",
                }, {
                    indicator: `option`,
                    dataType: "input pilihan",
                    defaultValue: "a,b",
                    uom: "a",
                }];

        return Promise.resolve(data);
    }

    getNewDataIndicators() {
        var Model = require("dl-models").master.MachineType;
        var data = new Model();

        var code = generateCode();


        data.code = code;
        data.name = `Ordername [${code}]`;
        data.description = `decription [${code}]`;
        data.indicators =
            [{
                indicator: "",
                dataType: "",
                defaultValue: "",
                uom: "",
            }];

        return Promise.resolve(data);
    }

    getNewTestData() {
        return helper
            .getManager(machineType)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }

    getNewTestData2() {
        return helper
            .getManager(machineType)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    data.code=generateCode();
                    data.indicators =
                    [{
                        indicator: `Tekanan Press Mangle`,
                        dataType: "number",
                        defaultValue: 10,
                        uom: "a",
                    },
                        {
                            indicator: `Tekanan Press Mangl`,
                            dataType: "string",
                            defaultValue: "10",
                            uom: "a",
                        }, {
                            indicator: `range`,
                            dataType: "option",
                            defaultValue: "1-10",
                            uom: "a",
                        }
                    ];
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}

module.exports = new MachineTypeDataUtil();