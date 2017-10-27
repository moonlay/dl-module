var options = {
    manager: require("../../../src/managers/master/yarn-material-manager"),
    model: require("dl-models").master.YarnMaterial,
    util: require("../../data-util/master/yarn-material-data-util"),
    validator: require("dl-models").validator.master.yarnMaterial,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
