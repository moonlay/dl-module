var options = {
    manager: require("../../../src/managers/garment-master-plan/standard-hour-manager"),
    model: require("dl-models").garmentMasterPlan.StandardHour,
    util: require("../../data-util/garment-master-plan/standard-hour-data-util"),
    validator: require("dl-models").validator.garmentMasterPlan.standardHour,
    createDuplicate: false,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);