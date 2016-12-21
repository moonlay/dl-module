var options = {
    manager: require("../../../src/managers/master/yarn-equivalent-conversion-manager"),
    model: require("dl-models").master.YarnEquivalentConversion,
    util: require("../../data-util/master/yarn-equivalent-conversion-data-util"),
    validator: require("dl-models").validator.master.yarnEquivalentConversion,
    createDuplicate: true,
    keys: ["ne"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
