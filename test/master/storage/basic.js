var options = {
    manager: require("../../../src/managers/master/storage-manager"),
    model: require("dl-models").master.Storage,
    util: require("../../data-util/master/storage-data-util"),
    validator: require("dl-models").validator.master.storage,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
