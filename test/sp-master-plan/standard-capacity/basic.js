var options = {
    manager: require("../../../src/managers/sp-master-plan/standard-capacity-manager"),
    model: require("dl-models").spMasterPlan.StandardCapacity,
    util: require("../../data-util/sp-master-plan/standard-capacity-data-util"),
    validator: require("dl-models").validator.spMasterPlan.standardCapacity,
    createDuplicate: false,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);