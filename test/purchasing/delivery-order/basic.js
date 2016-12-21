var options = {
    manager: require("../../../src/managers/purchasing/delivery-order-manager"),
    model: require("dl-models").purchasing.DeliveryOrder,
    util: require("../../data-util/purchasing/delivery-order-data-util"),
    validator: require("dl-models").validator.purchasing.deliveryOrder,
    createDuplicate: false,
    keys: ["refNo"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
