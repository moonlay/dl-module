var options = {
    manager: require("../../../src/managers/master/bad-output-reason-manager"),
    model: require("dl-models").master.BadOutputReason,
    util: require("../../data-util/master/bad-output-reason-data-util"),
    validator: require("dl-models").validator.master.badOutputReason,
    createDuplicate: true,
    keys: ["reason"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);