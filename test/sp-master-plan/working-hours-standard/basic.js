var options = {
    manager: require("../../../src/managers/garment-master-plan/working-hours-standard-manager"),
    model: require("dl-models").garmentMasterPlan.WorkingHoursStandard,
    util: require("../../data-util/garment-master-plan/working-hours-standard-data-util"),
    validator: require("dl-models").validator.garmentMasterPlan.workingHoursStandard,
    createDuplicate: true,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);