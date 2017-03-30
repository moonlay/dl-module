"use strict";
var generateCode = require("../../../src/utils/code-generator");
var MachineEvent = require('dl-models').master.MachineEvent;

class MachineEventDataUtil {
    getNewData() {
        var data = new MachineEvent();
        var code = generateCode();

        data.code = code;
        data.no = '99';
        data.name = `unitTestNewDataName[${code}]`;
        data.category = `category[${code}]`;
        return Promise.resolve(data);
    }

    getTestData() {
        var data = new MachineEvent();
        var code = generateCode();

        data.code = code;
        data.no = '1';
        data.name = `unitTestName[${code}]`;
        data.category = `category[${code}]`;

        return Promise.resolve(data);
    }

    getTestData2() {
        var data = new MachineEvent();
        var code = generateCode();

        data.code = code;
        data.no = '2';
        data.name = `unitTestName2[${code}]`;
        data.category = `category[${code}]`;

        return Promise.resolve(data);
    }

}
module.exports = new MachineEventDataUtil();
