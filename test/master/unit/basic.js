var options = {
    manager: require("../../../src/managers/master/unit-manager"),
    model: require("dl-models").master.Unit,
    util: require("../../data-util/master/unit-data-util"),
    validator: require("dl-models").validator.master.unit,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
