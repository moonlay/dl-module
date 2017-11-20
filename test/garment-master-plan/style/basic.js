var options = {
    manager: require("../../../src/managers/garment-master-plan/style-manager"),
    model: require("dl-models").garmentMasterPlan.Style,
    util: require("../../data-util/garment-master-plan/style-data-util"),
    validator: require("dl-models").validator.garmentMasterPlan.style,
    createDuplicate: true,
    keys:['code']
};

var basicTest = require("../../basic-test-factory");
basicTest(options);