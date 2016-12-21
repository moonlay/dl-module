var options = {
    manager: require("../../../src/managers/master/uom-manager"),
    model: require("dl-models").master.Uom,
    util: require("../../data-util/master/uom-data-util"),
    validator: require("dl-models").validator.master.uom,
    createDuplicate: true,
    keys: ["unit"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
