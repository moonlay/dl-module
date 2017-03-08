var options = {
    manager: require("../../../src/managers/master/quality-manager"),
    model: require("dl-models").master.Quality,
    util: require("../../data-util/master/quality-data-util"),
    validator: require("dl-models").validator.master.quality,
    createDuplicate: true,
    keys: ["code","name"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
