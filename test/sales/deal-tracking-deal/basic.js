var options = {
    manager: require("../../../src/managers/sales/deal-tracking-deal-manager"),
    model: require("dl-models").sales.DealTrackingDeal,
    util: require("../../data-util/sales/deal-tracking-deal-data-util"),
    validator: require("dl-models").validator.sales.dealTrackingDeal,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
