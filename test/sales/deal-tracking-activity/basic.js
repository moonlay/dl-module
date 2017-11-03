var options = {
    manager: require("../../../src/managers/sales/deal-tracking-activity-manager"),
    model: require("dl-models").sales.DealTrackingActivity,
    util: require("../../data-util/sales/deal-tracking-activity-data-util"),
    validator: require("dl-models").validator.sales.dealTrackingActivity,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
