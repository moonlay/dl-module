var options = {
    manager: require("../../../src/managers/master/product-manager"),
    model: require("dl-models").master.Product,
    util: require("../../data-util/master/product-data-util"),
    validator: require("dl-models").validator.master.product,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
