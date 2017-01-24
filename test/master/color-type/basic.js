var options = {
    manager: require("../../../src/managers/master/color-type-manager"),
    model: require("dl-models").master.ColorType,
    util: require("../../data-util/master/color-type-data-util"),
    validator: require("dl-models").validator.master.colorType,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
