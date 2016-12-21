var options = {
    manager: require("../../../src/managers/master/lot-machine-manager"),
    model: require("dl-models").master.LotMachint,
    util: require("../../data-util/master/lot-machine-data-util"),
    validator: require("dl-models").validator.master.lotMachine,
    createDuplicate: true,
    keys: ["productId", "machineId"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
