'use strict'
var helper = require("../../../helper");
var KanbanManager = require("../../../../src/managers/production/finishing-printing/kanban-manager");
var instructionDataUtil = require('../../master/instruction-data-util');
var productionOrderDataUtil = require('../../sales/production-order-data-util');
var codeGenerator = require('../../../../src/utils/code-generator');

class KanbanDataUtil {    
    getNewData() {
        return Promise.all([instructionDataUtil.getTestData(), productionOrderDataUtil.getNewTestData(true)])
                    .then(result => {
                        var _instruction = result[0];
                        var _productionOrder = result[1];
                        var detail = {};
                        for(var a of _productionOrder.details){
                            detail = a;
                        }
                        var code= codeGenerator();

                        var data = {
                            productionOrderId : _productionOrder._id,
                            productionOrder : _productionOrder,
                            color : detail.colorRequest,
                            colorTypeId : detail.colorTypeId,
                            colorType : detail.colorType,
                            grade : `grade ${code}`,
                            lengthFabric : _productionOrder.orderQuantity,
                            partitions : [{
                                no : `${code}1`,
                                lengthFabric : 15,
                                uomId : _productionOrder.uomId,
                                uom : _productionOrder.uom,
                                reference : ''
                            },{
                                no : `${code}2`,
                                lengthFabric : 15,
                                uomId : _productionOrder.uomId,
                                uom : _productionOrder.uom,
                                reference : ''
                            }],
                            instructionId : _instruction._id,
                            instruction : _instruction,
                            steps : _instruction.steps
                        };

                        return data;
                    })
    }
    
    getNewTestData() {
        return helper
            .getManager(KanbanManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                            });
                });
            });
    }
}
module.exports = new KanbanDataUtil();