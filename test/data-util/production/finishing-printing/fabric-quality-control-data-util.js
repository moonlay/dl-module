'use strict'
var helper = require("../../../helper");
var FabricQualityControlManager = require("../../../../src/managers/production/finishing-printing/fabric-quality-control-manager");
var KanbanDataUtil = require('./kanban-data-util');
var codeGenerator = require('../../../../src/utils/code-generator');

var Models = require("dl-models");
var Map = Models.map;
var KanbanModel = Models.production.finishingPrinting.Kanban;
var FabricQualityControlModel = Models.production.finishingPrinting.qualityControl.defect.FabricQualityControl;
var FabricGradeTestModel = Models.production.finishingPrinting.qualityControl.defect.FabricGradeTest;
var FabricTestCriterionModel = Models.production.finishingPrinting.qualityControl.defect.FabricTestCriterion;

class FabricQualityControlDataUtil {
    getNewData() {
        return Promise.all([KanbanDataUtil.getNewTestData()])
            .then(result => {
                var kanban = result[0];
                var gradeTest = new FabricGradeTestModel();
                gradeTest.pcsNo = "UT-PCSNO-001";
                gradeTest.initLength = 1200;
                gradeTest.width = 54;
                
                
                var data = {
                    code: codeGenerator(),
                    pointSystem: 10,
                    pointLimit: 0,
                    kanbanId: kanban._id,
                    dateIm: new Date(),
                    shiftIm: "UT Shift",
                    operatorIm: "UT Operator",
                    machineNoIm: "UT Machine No",
                    fabricGradeTests: [gradeTest],
                    kanbanCode: kanban.code,
                    productionOrderNo: kanban.productionOrder.orderNo,
                    productionOrderType: kanban.productionOrder.orderType.name
                };

                return data;
            })
    }

    getNewTestData() {
        return helper
            .getManager(FabricQualityControlManager)
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
module.exports = new FabricQualityControlDataUtil();
