var options = {
    manager: require("../../../src/managers/master/thread-specification-manager"),
    model: require("dl-models").master.ThreadSpecification,
    util: require("../../data-util/master/thread-specification-data-util"),
    validator: require("dl-models").validator.master.threadSpecification,
    createDuplicate: true,
    keys: ["productId"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
