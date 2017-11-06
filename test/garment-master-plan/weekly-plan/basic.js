var options = {
    manager: require("../../../src/managers/garment-master-plan/weekly-plan-manager"),
    model: require("dl-models").garmentMasterPlan.WeeklyPlan,
    util: require("../../data-util/garment-master-plan/weekly-plan-data-util"),
    validator: require("dl-models").validator.garmentMasterPlan.weeklyPlan,
    createDuplicate: false,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);