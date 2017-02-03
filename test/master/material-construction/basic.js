var options = {
    manager: require("../../../src/managers/master/material-construction-manager"),
    model: require("dl-models").master.MaterialConstruction,
    util: require("../../data-util/master/material-construction-data-util"),
    validator: require("dl-models").validator.master.materialConstruction,
    createDuplicate: true,
    keys: ["name"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
