var options = {
    manager: require("../../../src/managers/master/garment-product-manager"),
    model: require("dl-models").master.Product,
    util: require("../../data-util/master/garment-product-data-util"),
    validator: require("dl-models").validator.master.product,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
