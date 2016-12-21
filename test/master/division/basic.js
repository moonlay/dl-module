var options = {
    manager: require("../../../src/managers/master/division-manager"),
    model: require("dl-models").master.Division,
    util: require("../../data-util/master/division-data-util"),
    validator: require("dl-models").validator.master.division,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
