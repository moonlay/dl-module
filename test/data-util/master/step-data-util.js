"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");
var UomDataUtil = require("./uom-data-util");

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

                var process1 = {
                    name : `data 1 ${code}`,
                    value : `value 1 ${code}`,
                    uom : `uom 1 ${code}`
                } 
                var process2 = {
                    name : `data 2 ${code}`,
                    value : `value 2 ${code}`,
                    uom : `uom 2 ${code}`
                }
                data.stepIndicators.push(process1);
                data.stepIndicators.push(process2); 

                return Promise.resolve(data);
    }

    getTestData(data, items, indicator) {
                var _process = data ? data : "GAS SINGEING DAN DESIZING";
                var _itemMonitoring = items ? items : [
                        'Speed (m/mnt)', 'Pressure Burner (mBar)', 'Titik Api', 'Pressure Saturator (Bar)', 'Hasil Bakar Bulu (baik/tidak)'
                    ];
                var _stepIndicator = indicator ? indicator : [
                    {
                        name : 'SETTING',
                        value : '3'
                    },
                    {
                        name : 'PRESS. BURNER',
                        value : '14',
                        uom : 'mBar'
                    },
                    {
                        name : 'TEMP. SATURATOR',
                        value : '65',
                        uom : 'C'
                    },
                    {
                        name : 'SPEED',
                        value : '90',
                        uom : 'm/mnt'
                    },
                    {
                        name : 'TITIK API',
                        value : '3'
                    },
                    {
                        name : 'LEBAR KAIN',
                        value : '',
                        uom : 'inchi'
                    },
                    {
                        name : 'COUNTER',
                        value : ''
                    }
                ];
                 var data = {
                    process: _process,
                    itemMonitoring:_itemMonitoring,
                    stepIndicators:_stepIndicator
                };
                return this.getSert(data);
    }
}
module.exports = new StepDataUtil();
