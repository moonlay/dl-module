"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class StepDataUtil {
    getSert(input) {
        var StepType = require("../../../src/managers/master/step-manager");
        return _getSert(input, StepType, (data) => {
            return {
                process: data.process
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").master.Step;
        var data = new Model();

        var code = generateCode();

        data.process = code;
        var item1 = `data 1 ${code}`;
        var item2 = `data 2 ${code}`;
        data.itemMonitoring.push(item1);
        data.itemMonitoring.push(item2);

        return Promise.resolve(data);
    }

    getTestData(data, items) {
        var _process = data ? data : "GAS SINGEING DAN DESIZING";
        var _itemMonitoring = items ? items : [
                'Speed (m/mnt)', 'Pressure Burner (mBar)', 'Titik Api', 'Pressure Saturator (Bar)', 'Hasil Bakar Bulu (baik/tidak)'
            ];
        var data = {
            process: _process,
            itemMonitoring:_itemMonitoring
        };
        return this.getSert(data);
    }
}
module.exports = new StepDataUtil();
