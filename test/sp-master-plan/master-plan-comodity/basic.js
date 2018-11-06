var options = {
    manager: require("../../../src/managers/sp-master-plan/master-plan-comodity-manager"),
    model: require("dl-models").spMasterPlan.MasterPlanComodity,
    util: require("../../data-util/sp-master-plan/master-plan-comodity-data-util"),
    validator: require("dl-models").validator.spMasterPlan.masterPlanComodity,
    createDuplicate: true,
    keys:['code']
};

var basicTest = require("../../basic-test-factory");
basicTest(options);