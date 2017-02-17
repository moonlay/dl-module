var options = {
    manager: require("../../../src/managers/master/step-manager"),
    model: require("dl-models").master.Step,
    util: require("../../data-util/master/step-data-util"),
    validator: require("dl-models").validator.master.step,
    createDuplicate: true,
    keys: ["process"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);