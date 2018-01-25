var options = {
    manager: require("../../../src/managers/garment-master-plan/garment-section-manager"),
    model: require("dl-models").garmentMasterPlan.GarmentSection,
    util: require("../../data-util/garment-master-plan/garment-section-data-util"),
    validator: require("dl-models").validator.garmentMasterPlan.garmentSection,
    createDuplicate: true,
    keys:['code', 'name']
};

var basicTest = require("../../basic-test-factory");
basicTest(options);