var options = {
    manager: require("../../../src/managers/master/uster-manager"),
    model: require("dl-models").master.Uster,
    util: require("../../data-util/master/uster-data-util"),
    validator: require("dl-models").validator.master.uster,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
