var options = {
    manager: require("../../../src/managers/master/comodity-manager"),
    model: require("dl-models").master.Comodity,
    util: require("../../data-util/master/comodity-data-util"),
    validator: require("dl-models").validator.master.comodity,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
