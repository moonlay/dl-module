var options = {
    manager: require("../../../src/managers/master/product-manager"),
    model: require("dl-models").master.Product,
    util: require("../../data-util/master/product-data-util"),
    validator: require("dl-models").validator.master.product,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
