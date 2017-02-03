var options = {
    manager: require("../../../src/managers/master/standard-test-manager"),
    model: require("dl-models").master.StandardTest,
    util: require("../../data-util/master/standard-test-data-util"),
    validator: require("dl-models").validator.master.standardTest,
    createDuplicate: true,
    keys: ["name"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
