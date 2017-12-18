var options = {
    manager: require("../../../src/managers/garment-master-plan/master-plan-manager"),
    model: require("dl-models").garmentMasterPlan.MasterPlan,
    util: require("../../data-util/garment-master-plan/master-plan-data-util"),
    validator: require("dl-models").validator.garmentMasterPlan.masterPlan,
    createDuplicate: false,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);