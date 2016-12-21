var options = {
    manager: require("../../../src/managers/master/budget-manager"),
    model: require("dl-models").master.Budget,
    util: require("../../data-util/master/budget-data-util"),
    validator: require("dl-models").validator.master.budget,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
