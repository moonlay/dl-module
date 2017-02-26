'use strict'
var helper = require('../../../helper');
var DailyOperationManager = require('../../../../src/managers/production/finishing-printing/daily-operation-manager');
var codeGenerator = require('../../../../src/utils/code-generator');
var instructionDataUtil = require('../../master/instruction-data-util');
var uomDataUtil = require('../../master/uom-data-util');
var unitDataUtil = require('../../master/unit-data-util');
var machineDataUtil = require('../../master/machine-data-util');
var productionOrderDataUtil = require('../../sales/production-order-data-util');

class DailyOperationDataUtil {
    getNewData(data) {
        return Promise.all([uomDataUtil.getTestData(), unitDataUtil.getTestData()])
                    .then(data => {
                        var getMachine = data && data.machine ? Promise.resolve(null) :  machineDataUtil.getTestData();
                        return Promise.all([productionOrderDataUtil.getNewTestData(true), getMachine])
                                .then((results) => {
                                    var _productionOrder = results[0];
                                    var _machine = data && data.machine ? data.machine : results[1];
                                    var color = '';
                                    var colorType = {};
                                    for (var c of _productionOrder.details){
                                        color = c.colorRequest;
                                        colorType = c.colorType;
                                        break;
                                    }
                                    var data = {
                                        name : `instruction for production order ${_productionOrder.orderNo}`,
                                        orderType : _productionOrder.orderType,
                                        colorType : colorType,
                                        product : _productionOrder.material,
                                        construction : _productionOrder.construction,
                                        steps : [_machine.step.process]
                                    }
                                    return instructionDataUtil.getTestData(data)
                                                    .then((_instruction) => {
                                                            var code = codeGenerator();
                                                            var pOrderModel = require("dl-models").sales.ProductionOrder;
                                                            var date = new Date();
                                                            var dataSteps = [];
                                                            for(var a of _machine.step.itemMonitoring){
                                                                var tamp = {
                                                                    key : a,
                                                                    value : code
                                                                };
                                                                dataSteps.push(tamp);
                                                            }
                                                            var data = {
                                                                code : code,
                                                                salesContract : _productionOrder.salesContractNo,
                                                                productionOrderId : _productionOrder._id,
                                                                productionOrder : new pOrderModel(_productionOrder),
                                                                materialId : _productionOrder.materialId,
                                                                material : _productionOrder.material,
                                                                materialConstructionId : _productionOrder.materialConstructionId,
                                                                materialConstruction : _productionOrder.materialConstruction,
                                                                yarnMaterialId : _productionOrder.yarnMaterialId,
                                                                yarnMaterial : _productionOrder.yarnMaterial,
                                                                color : color,
                                                                colorTypeId : colorType._id,
                                                                colorType : colorType,
                                                                instruction : _instruction,
                                                                instructionId : _instruction._id,
                                                                no : `Partition ${code}`,
                                                                shift : `shift ${code}`,
                                                                stepId : _machine.stepId,
                                                                step : _machine.step,
                                                                steps : dataSteps,
                                                                machineId : _machine._id,
                                                                machine : _machine,
                                                                dateInput : date,
                                                                timeInput : 10000,
                                                                input : 20,
                                                                dateOutput : date,
                                                                timeOutput : 12000,
                                                                goodOutput : 18,
                                                                badOutput : 2,
                                                                badOutputDescription : code
                                                            };
                                                            return Promise.resolve(data);
                                                    });
                                });
                    });
    }
}
module.exports = new DailyOperationDataUtil();
