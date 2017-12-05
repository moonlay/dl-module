var options = {
    manager: require("../../../src/managers/garment-master-plan/master-plan-comodity-manager"),
    model: require("dl-models").garmentMasterPlan.MasterPlanComodity,
    util: require("../../data-util/garment-master-plan/master-plan-comodity-data-util"),
    validator: require("dl-models").validator.garmentMasterPlan.masterPlanComodity,
    createDuplicate: true,
    keys:['code']
};

var basicTest = require("../../basic-test-factory");
basicTest(options);