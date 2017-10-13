var options = {
    manager: require("../../../src/managers/master/vat-manager"),
    model: require("dl-models").master.Vat,
    util: require("../../data-util/master/vat-data-util"),
    validator: require("dl-models").validator.master.vat,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
