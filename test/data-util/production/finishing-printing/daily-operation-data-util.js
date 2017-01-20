'use strict'
var helper = require('../../../helper');
var DailyOperationManager = require('../../../../src/managers/production/finishing-printing/daily-operation-manager');
var codeGenerator = require('../../../../src/utils/code-generator');
var instructionDataUtil = require('../../master/instruction-data-util');
var machineDataUtil = require('../../master/machine-data-util');
var productionOrderDataUtil = require('../../sales/production-order-data-util');

class DailyOperationDataUtil {
    getNewData(data) {
        var getMachine = data && data.machine ? Promise.resolve(null) :  machineDataUtil.getTestData();
        return Promise.all([productionOrderDataUtil.getNewTestData(true), getMachine])
                .then((results) => {
                    var _productionOrder = results[0];
                    var _machine = data && data.machine ? data.machine : results[1];
                    var pOrder = {};
                    var color = '';
                    var colorType = {};
                    for (var a of _productionOrder.productionOrders){
                        pOrder = a;
                        for (var c of a.details){
                            color = c.colorRequest;
                            colorType = c.colorType;
                            break;
                        }
                        break;
                    }
                    var data = {
                        name : `instruction for production order ${_productionOrder.orderNo}`,
                        orderType : pOrder.orderType,
                        colorType : colorType,
                        product : pOrder.material,
                        construction : pOrder.construction,
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
                                                productionOrder : new pOrderModel(pOrder),
                                                materialId : pOrder.materialId,
                                                material : pOrder.material,
                                                construction : pOrder.construction,
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
                                                input : 20,
                                                dateOutput : date,
                                                goodOutput : 18,
                                                badOutput : 2,
                                                badOutputDescription : code
                                            };
                                            return Promise.resolve(data);
                                    });
                });
    }
}
module.exports = new DailyOperationDataUtil();
