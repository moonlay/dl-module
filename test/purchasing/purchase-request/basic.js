var options = {
    manager: require("../../../src/managers/purchasing/purchase-request-manager"),
    model: require("dl-models").purchasing.purchaseRequest,
    util: require("../../data-util/purchasing/purchase-request-data-util"),
    validator: require("dl-models").validator.purchasing.purchaseRequest,
    createDuplicate: false,
    keys: ["no"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options); 