var options = {
    manager: require("../../../src/managers/purchasing/purchase-order-external-manager"),
    model: require("dl-models").purchasing.PurchaseOrderExternal,
    util: require("../../data-util/purchasing/purchase-order-external-data-util"),
    validator: require("dl-models").validator.purchasing.purchaseOrderExternal,
    createDuplicate: false,
    keys: ["no"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
