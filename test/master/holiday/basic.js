var options = {
    manager: require("../../../src/managers/master/holiday-manager"),
    model: require("dl-models").master.Holiday,
    util: require("../../data-util/master/holiday-data-util"),
    validator: require("dl-models").validator.master.holiday,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
