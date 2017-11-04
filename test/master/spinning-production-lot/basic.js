var options = {
    manager: require("../../../src/managers/master/spinning-production-lot-manager"),
    model: require("dl-models").master.SpinningProductionLot,
    util: require("../../data-util/master/spinning-production-lot-data-util"),
    validator: require("dl-models").validator.master.spinningProductionLot,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
