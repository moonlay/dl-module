var options = {
    manager: require("../../../src/managers/master/machine-spesification-standard-manager"),
    model: require("dl-models").master.MachineSpesificationStandard,
    util: require("../../data-util/master/machine-spesification-standard-data-util"),
    validator: require("dl-models").validator.master.machineSpesificationStandard,
    createDuplicate: true,
    keys: ["valueName"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);