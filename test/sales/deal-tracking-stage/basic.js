var options = {
    manager: require("../../../src/managers/sales/deal-tracking-stage-manager"),
    model: require("dl-models").sales.DealTrackingStage,
    util: require("../../data-util/sales/deal-tracking-stage-data-util"),
    validator: require("dl-models").validator.sales.dealTrackingStage,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
