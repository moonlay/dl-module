var options = {
    manager: require("../../../src/managers/master/process-type-manager"),
    model: require("dl-models").master.ProcessType,
    util: require("../../data-util/master/process-type-data-util"),
    validator: require("dl-models").validator.master.processType,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
