var options = {
    manager: require("../../../src/managers/sp-master-plan/weekly-plan-manager"),
    model: require("dl-models").spMasterPlan.WeeklyPlan,
    util: require("../../data-util/sp-master-plan/weekly-plan-data-util"),
    validator: require("dl-models").validator.spMasterPlan.weeklyPlan,
    createDuplicate: false,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);