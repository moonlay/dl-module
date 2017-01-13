"use strict";
var _getSert = require("../getsert");
var material = require("./product-data-util");
var orderType = require("./order-type-data-util");
var colorType = require("./color-type-data-util");
var generateCode = require("../../../src/utils/code-generator");

class InstructionDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/instruction-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                materialId      : data.materialId,
                construction    : data.construction,
                orderTypeId     : data.orderTypeId,
                colorTypeId     : data.colorTypeId
            };
        });
    }

    getNewData() {
       return Promise.all([material.getRandomTestData(), orderType.getTestData(), colorType.getTestData()])
            .then((results) => {
                var material = results[0];
                var orderType = results[1];
                var colorType = results[2];

                var code = generateCode();

                var data = {
                    materialId:material._id,
                    material:material,
                    orderTypeId:orderType._id,
                    orderType:orderType,
                    colorTypeId:colorType._id,
                    colorType:colorType,
                    construction : `construction[${code}]`,
                    steps:[`step1[${code}]`,`step2[${code}]`,`step3[${code}]`]
                    };
                return Promise.resolve(data);
            });
    }

    getTestData() {
        return Promise.all([material.getTestData(), orderType.getTestData(), colorType.getTestData()])
            .then((results) => {
                var material = results[0];
                var orderType = results[1];
                var colorType = results[2];

                var code = generateCode();

                var data = {
                    materialId:material._id,
                    material:material,
                    orderTypeId:orderType._id,
                    orderType:orderType,
                    colorTypeId:colorType._id,
                    colorType:colorType,
                    construction : '2/1 133 construction',
                    steps:['BLEACHING','SCOURING','MERCERIZE']
                    };
                return this.getSert(data);
            });
    }
}
module.exports = new InstructionDataUtil();