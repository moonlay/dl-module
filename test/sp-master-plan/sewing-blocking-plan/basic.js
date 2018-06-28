var options = {
    manager: require("../../../src/managers/garment-master-plan/sewing-blocking-plan-manager"),
    model: require("dl-models").garmentMasterPlan.SewingBlockingPlan,
    util: require("../../data-util/garment-master-plan/sewing-blocking-plan-data-util"),
    validator: require("dl-models").validator.garmentMasterPlan.sewingBlockingPlan,
    createDuplicate: false,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);