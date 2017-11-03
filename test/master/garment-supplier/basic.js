var options = {
    manager: require("../../../src/managers/master/garment-supplier-manager"),
    model: require("dl-models").master.Supplier,
    util: require("../../data-util/master/garment-supplier-data-util"),
    validator: require("dl-models").validator.master.supplier,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
