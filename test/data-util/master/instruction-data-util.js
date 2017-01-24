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
                name            : data.name,
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
                    name : code,
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
    
    getTestData(data) {
        var testDataMaterial = data && data.product ? Promise.resolve(null) : material.getRandomTestData();
        var testDataOrderType = data && data.orderType ? Promise.resolve(null) : orderType.getTestData();
        var testDataColorType = colorType.getTestData(); // : colorType.getTestData();
        if(data.orderType){
            if(data.orderType.name === "Printing" || data.orderType.name === "Yarn Dyed"){
                    testDataColorType = Promise.resolve(null);
            }
        }
        return Promise.all([testDataMaterial, testDataOrderType, testDataColorType])
            .then((results) => {
                var material = results[0];
                var orderType = results[1];
                var colorType = results[2];

                var dataColorTypeId = null;
                var dataColorType = null;
                if(data.colorType)
                {
                    if(data.orderType){
                        if(data.orderType.name != "Printing" && data.orderType.name != "Yarn Dyed"){
                            dataColorTypeId = data.colorType._id;
                            dataColorType = data.colorType;
                        }
                    }else if(orderType){
                        if(orderType.name != "Printing" && orderType.name != "Yarn Dyed"){
                            dataColorTypeId = data.colorType._id;
                            dataColorType = data.colorType;
                        }
                    }
                }else{
                    if(data.orderType){
                        if(data.orderType.name != "Printing" && data.orderType.name != "Yarn Dyed"){
                            dataColorTypeId = colorType._id;
                            dataColorType = colorType;
                        }
                    }else if(orderType){
                        if(orderType.name != "Printing" && orderType.name != "Yarn Dyed"){
                            dataColorTypeId = colorType._id;
                            dataColorType = colorType;
                        }
                    }
                }

                var code = generateCode();

                var dataReturn = {
                        name: data && data.name ? data.name : "Dyeing",
                        orderTypeId : data && data.orderType ? data.orderType._id : orderType._id,
                        orderType : data && data.orderType ? data.orderType : orderType,
                        materialId : data && data.product ? data.product._id : material._id,
                        material : data && data.product ? data.product : material,
                        construction : data && data.construction ? data.construction : "2/1 133 X 72 63\"",
                        colorTypeId : dataColorTypeId,
                        colorType : dataColorType,
                        steps : data && data.steps ? data.steps : ['GAS SINGEING DAN DESIZING', 'SCOURING', 'BLEACHING']
                    };
                return this.getSert(dataReturn);
            });
    }
}

module.exports = new InstructionDataUtil();