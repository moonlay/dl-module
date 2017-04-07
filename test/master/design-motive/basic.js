var options = {
    manager: require("../../../src/managers/master/design-motive-manager"),
    model: require("dl-models").master.DesignMotive,
    util: require("../../data-util/master/design-motive-data-util"),
    validator: require("dl-models").validator.master.designMotive,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
