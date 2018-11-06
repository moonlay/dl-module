var options = {
    manager: require("../../../src/managers/sp-master-plan/sp-section-manager"),
    model: require("dl-models").spMasterPlan.SpSection,
    util: require("../../data-util/sp-master-plan/sp-section-data-util"),
    validator: require("dl-models").validator.spMasterPlan.spSection,
    createDuplicate: true,
    keys:['code', 'name']
};

var basicTest = require("../../basic-test-factory");
basicTest(options);