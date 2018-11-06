var options = {
    manager: require("../../../src/managers/sp-master-plan/sp-blocking-plan-manager"),
    model: require("dl-models").spMasterPlan.SpBlockingPlan,
    util: require("../../data-util/sp-master-plan/sp-blocking-plan-data-util"),
    validator: require("dl-models").validator.spMasterPlan.spBlockingPlan,
    createDuplicate: false,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);