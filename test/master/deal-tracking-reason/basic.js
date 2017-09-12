var options = {
    manager: require("../../../src/managers/master/deal-tracking-reason-manager"),
    model: require("dl-models").master.DealTrackingReason,
    util: require("../../data-util/master/deal-tracking-reason-data-util"),
    validator: require("dl-models").validator.master.dealTrackingReason,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
