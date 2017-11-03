var options = {
    manager: require("../../../src/managers/master/spinning-lot-production-manager"),
    model: require("dl-models").master.SpinningProductionLot,
    util: require("../../data-util/master/spinning-lot-production-data-util"),
    validator: require("dl-models").validator.master.spinningProductionLot,
    createDuplicate: true,
    keys: ["unitId","lot","spinningYarnId","machineId"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
