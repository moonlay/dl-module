var options = {
    manager: require("../../../src/managers/master/garment-buyer-manager"),
    model: require("dl-models").master.Buyer,
    util: require("../../data-util/master/garment-buyer-data-util"),
    validator: require("dl-models").validator.master.buyer,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);