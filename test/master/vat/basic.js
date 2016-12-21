var options = {
    manager: require("../../../src/managers/master/vat-manager"),
    model: require("dl-models").master.Vat,
    util: require("../../data-util/master/vat-data-util"),
    validator: require("dl-models").validator.master.vat,
    createDuplicate: true,
    keys: ["name", "rate"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
