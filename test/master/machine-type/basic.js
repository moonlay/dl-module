var options = {
    manager: require("../../../src/managers/master/machine-type-manager"),
    model: require("dl-models").master.MachineType,
    util: require("../../data-util/master/machine-type-data-util"),
    validator: require("dl-models").validator.master.machineType,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
