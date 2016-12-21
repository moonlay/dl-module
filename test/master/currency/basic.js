var options = {
    manager: require("../../../src/managers/master/currency-manager"),
    model: require("dl-models").master.Currency,
    util: require("../../data-util/master/currency-data-util"),
    validator: require("dl-models").validator.master.currency,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);