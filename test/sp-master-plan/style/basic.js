var options = {
    manager: require("../../../src/managers/sp-master-plan/style-manager"),
    model: require("dl-models").spMasterPlan.Style,
    util: require("../../data-util/sp-master-plan/style-data-util"),
    validator: require("dl-models").validator.spMasterPlan.style,
    createDuplicate: true,
    keys:['code']
};

var basicTest = require("../../basic-test-factory");
basicTest(options);