var options = {
    manager: require("../../../../src/managers/production/finishing-printing/packing-manager"),
    model: require("dl-models").production.finishingPrinting.qualityControl.Packing,
    util: require("../../../data-util/production/finishing-printing/packing-data-util"),
    validator: require("dl-models").validator.production.finishingPrinting.qualityControl.packing,
    createDuplicate: false,
    keys: ["code"]
};

var basicTest = require("../../../basic-test-factory");
basicTest(options); 