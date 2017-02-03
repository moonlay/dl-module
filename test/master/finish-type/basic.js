var options = {
    manager: require("../../../src/managers/master/finish-type-manager"),
    model: require("dl-models").master.FinishType,
    util: require("../../data-util/master/finish-type-data-util"),
    validator: require("dl-models").validator.master.finishType,
    createDuplicate: true,
    keys: ["name"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
