var options = {
    manager: require("../../../src/managers/master/lamp-standard-manager"),
    model: require("dl-models").master.LampStandard,
    util: require("../../data-util/master/lamp-standard-data-util"),
    validator: require("dl-models").validator.master.lampStandard,
    createDuplicate: true,
    keys: ["name"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
