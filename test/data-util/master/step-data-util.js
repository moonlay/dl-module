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
                data.alias="alias";
                // var item1 = `data 1 ${code}`;
                // var item2 = `data 2 ${code}`;
                // data.itemMonitoring.push(item1);
                // data.itemMonitoring.push(item2);


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

    getTestData(step) {
                var _process = step && step.process ? step.process : "GAS SINGEING DAN DESIZING";
                // var _itemMonitoring = items ? items : [
                //         'Speed (m/mnt)', 'Pressure Burner (mBar)', 'Titik Api', 'Pressure Saturator (Bar)', 'Hasil Bakar Bulu (baik/tidak)'
                //     ];
                var _alias = step && step.alias ? step.alias : "GS DZ";
                var _stepIndicator = step && step.indicators ? step.indicators : [
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
                    alias:_alias,
                    stepIndicators:_stepIndicator
                };
                return this.getSert(data);
    }

    // getTestData2(data, items, indicator) {
    //             var _process = data ? data : "SCOURING";
    //             // var _itemMonitoring = items ? items : [
    //             //         'Speed (m/mnt)', 'TEMP. L BOX', 'TIMING', 'LEBAR KAIN'
    //             //     ];
    //             var _alias="";
    //             var _stepIndicator = indicator ? indicator : [
    //                 {
    //                     name : 'SPEED',
    //                     value : '60',
    //                     uom : 'm/mnt'
    //                 },
    //                 {
    //                     name : 'TEMP. L BOX',
    //                     value : '100',
    //                     uom : 'C'
    //                 },
    //                 {
    //                     name : 'TIMING',
    //                     value : '30',
    //                     uom : 'menit'
    //                 },
    //                 {
    //                     name : 'LEBAR KAIN',
    //                     value : '90',
    //                     uom : 'inch'
    //                 },
    //                 {
    //                     name : 'COUNTER',
    //                     value : ''
    //                 }
    //             ];
    //              var data = {
    //                 process: _process,
    //                 alias:_alias,
    //                 stepIndicators:_stepIndicator
    //             };
    //             return this.getSert(data);
    // }
}
module.exports = new StepDataUtil();
