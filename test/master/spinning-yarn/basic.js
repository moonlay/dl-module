var options = {
    manager: require("../../../src/managers/master/spinning-yarn-manager"),
    model: require("dl-models").master.SpinningYarn,
    util: require("../../data-util/master/spinning-yarn-data-util"),
    validator: require("dl-models").validator.master.spinningYarn,
    createDuplicate: true,
    keys: ["name","code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
