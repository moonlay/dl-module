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
                        var _selectedProductionOrderDetail = (_productionOrder.details && _productionOrder.details.length > 0) ? _productionOrder.details[0] : {};

                        var data = {
                            code : codeGenerator(),
                            productionOrderId : _productionOrder._id,
                            productionOrder : _productionOrder,
                            selectedProductionOrderDetail: _selectedProductionOrderDetail,
                            cart: { code : "cartUnitTestCode", cartNumber : "unitTestCartNumber", qty : 15, pcs : _selectedProductionOrderDetail.quantity/2},
                            instructionId : _instruction._id,
                            instruction : _instruction,
                            grade : 'unitTestGrade',
                            qtyCurrent : _productionOrder.orderQuantity,
                        };

                        return data;
                    })
    }
    
    getNewDataExistingProductionOrder(productionOrder) {
        return Promise.all([instructionDataUtil.getTestData()])
                    .then(result => {
                        var _instruction = result[0];
                        var _productionOrder =  productionOrder;
                        var _selectedProductionOrderDetail = (_productionOrder.details && _productionOrder.details.length > 0) ? _productionOrder.details[0] : {};

                        var data = {
                            code : codeGenerator(),
                            productionOrderId : _productionOrder._id,
                            productionOrder : _productionOrder,
                            selectedProductionOrderDetail: _selectedProductionOrderDetail,
                            cart: { code : "cartUnitTestCode", cartNumber : "unitTestCartNumber", qty : 15, pcs : _selectedProductionOrderDetail.quantity/2},
                            instructionId : _instruction._id,
                            instruction : _instruction,
                            grade : 'unitTestGrade',
                            qtyCurrent : _productionOrder.orderQuantity,
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

    getNewTestDataExistingProductionOrder(productionOrder) {
        return helper
            .getManager(KanbanManager)
            .then((manager) => {
                return this.getNewDataExistingProductionOrder(productionOrder).then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                            });
                });
            });
    }
}
module.exports = new KanbanDataUtil();