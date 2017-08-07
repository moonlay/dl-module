var options = {
    manager: require("../../../src/managers/master/fp-duration-estimation-manager"),
    model: require("dl-models").master.FinishingPrintingDurationEstimation,
    util: require("../../data-util/master/fp-duration-estimation-data-util"),
    validator: require("dl-models").validator.master.finishingPrintingDurationEstimation,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
