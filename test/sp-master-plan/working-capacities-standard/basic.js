var options = {
    manager: require("../../../src/managers/sp-master-plan/working-hours-standard-manager"),
    model: require("dl-models").spMasterPlan.WorkingCapacitiesStandard,
    util: require("../../data-util/sp-master-plan/working-hours-standard-data-util"),
    validator: require("dl-models").validator.spMasterPlan.workingCapacitiesStandard,
    createDuplicate: true,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);