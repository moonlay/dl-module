'use strict'
var helper = require("../../../helper");
var KanbanManager = require("../../../../src/managers/production/finishing-printing/kanban-manager");
var instructionDataUtil = require('../../master/instruction-data-util');
var productionOrderDataUtil = require('../../sales/production-order-data-util');
var machineDataUtil = require("../../master/machine-data-util");
var codeGenerator = require('../../../../src/utils/code-generator');

class KanbanDataUtil {
    getNewData() {
        return Promise.all([instructionDataUtil.getTestData(), productionOrderDataUtil.getNewTestData(true)])
            .then(result => {
                var _instruction = result[0];
                var _productionOrder = result[1];
                // var _machine = result[2];
                var _machine;

                return machineDataUtil
                    .getTestData()
                    .then(res => {
                        _machine = res;

                        var _selectedProductionOrderDetail = (_productionOrder.details && _productionOrder.details.length > 0) ? _productionOrder.details[0] : {};

                        _instruction.steps.map((step) => {
                            step.machine = _machine;
                            step.processArea = "Area Pre Treatment";
                            step.deadline = new Date();
                            return step;
                        });

                        var data = {
                            code: codeGenerator(),
                            productionOrderId: _productionOrder._id,
                            productionOrder: _productionOrder,
                            selectedProductionOrderDetail: _selectedProductionOrderDetail,
                            cart: { code: "cartUnitTestCode", cartNumber: "unitTestCartNumber", qty: 15, pcs: _selectedProductionOrderDetail.quantity / 2 },
                            instructionId: _instruction._id,
                            instruction: _instruction,
                            grade: 'unitTestGrade',
                            qtyCurrent: _productionOrder.orderQuantity,
                        };

                        return data;
                    });
            });
    }

    getWhiteOrderTypeData() {
        return Promise.all([instructionDataUtil.getNewInstructionData(), productionOrderDataUtil.getNewWhiteOrderTypeData(null)])
            .then(result => {
                var _instruction = result[0];
                var _productionOrder = result[1];
                // var _machine = result[2];
                var _machine;

                return machineDataUtil
                    .getTestData()
                    .then(res => {
                        _machine = res;

                        var _selectedProductionOrderDetail = (_productionOrder.details && _productionOrder.details.length > 0) ? _productionOrder.details[0] : {};

                        _instruction.steps = _instruction.steps.map((step) => {
                            step.machine = _machine;
                            step.processArea = "Area Pre Treatment";
                            step.deadline = new Date();
                            return step;
                        });

                        _instruction.steps[1].processArea = "Area Finishing";

                        var data = {
                            code: codeGenerator(),
                            productionOrderId: _productionOrder._id,
                            productionOrder: _productionOrder,
                            selectedProductionOrderDetail: _selectedProductionOrderDetail,
                            cart: { code: "cartUnitTestCode", cartNumber: "unitTestCartNumber", qty: 15, pcs: _selectedProductionOrderDetail.quantity / 2 },
                            instructionId: _instruction._id,
                            instruction: _instruction,
                            grade: 'unitTestGrade',
                            qtyCurrent: _productionOrder.orderQuantity,
                        };

                        return data;
                    });
            });
    }

    getPrintingOrderTypeData() {
        return Promise.all([instructionDataUtil.getNewInstructionData(), productionOrderDataUtil.getNewPrintingOrderTypeData(null)])
            .then(result => {
                var _instruction = result[0];
                var _productionOrder = result[1];
                // var _machine = result[2];
                var _machine;

                return machineDataUtil
                    .getTestData()
                    .then(res => {
                        _machine = res;

                        var _selectedProductionOrderDetail = (_productionOrder.details && _productionOrder.details.length > 0) ? _productionOrder.details[0] : {};

                        _instruction.steps.map((step) => {
                            step.machine = _machine;
                            step.processArea = "Area Finishing";
                            step.deadline = new Date();
                            return step;
                        });

                        _instruction.steps[1].processArea = "Area Pre Treatment";

                        var data = {
                            code: codeGenerator(),
                            productionOrderId: _productionOrder._id,
                            productionOrder: _productionOrder,
                            selectedProductionOrderDetail: _selectedProductionOrderDetail,
                            cart: { code: "cartUnitTestCode", cartNumber: "unitTestCartNumber", qty: 15, pcs: _selectedProductionOrderDetail.quantity / 2 },
                            instructionId: _instruction._id,
                            instruction: _instruction,
                            grade: 'unitTestGrade',
                            qtyCurrent: _productionOrder.orderQuantity,
                        };

                        return data;
                    });
            });
    }

    getNewWhiteOrderTypeData() {
        return helper
            .getManager(KanbanManager)
            .then((manager) => {
                return this.getWhiteOrderTypeData()
                    .then((data) => {
                        return manager.create(data)
                            .then((id) => {
                                return manager.getSingleById(id)
                            });
                    });
            });
    }

    getNewPrintingOrderTypeData() {
        return helper
            .getManager(KanbanManager)
            .then((manager) => {
                return this.getPrintingOrderTypeData()
                    .then((data) => {
                        return manager.create(data)
                            .then((id) => {
                                return manager.getSingleById(id)
                            });
                    });
            });
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