var options = {
    manager: require("../../../src/managers/master/order-type-manager"),
    model: require("dl-models").master.OrderType,
    util: require("../../data-util/master/order-type-data-util"),
    validator: require("dl-models").validator.master.orderType,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
