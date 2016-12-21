var options = {
    manager: require("../../../src/managers/master/buyer-manager"),
    model: require("dl-models").master.Buyer,
    util: require("../../data-util/master/buyer-data-util"),
    validator: require("dl-models").validator.master.buyer,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);