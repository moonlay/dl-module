var options = {
    manager: require("../../../src/managers/sales/deal-tracking-board-manager"),
    model: require("dl-models").sales.DealTrackingBoard,
    util: require("../../data-util/sales/deal-tracking-board-data-util"),
    validator: require("dl-models").validator.sales.dealTrackingBoard,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
