var options = {
    manager: require("../../../../src/managers/production/finishing-printing/inspection-lot-color-manager"),
    model: require("dl-models").production.finishingPrinting.qualityControl.InspectionLotColor,
    util: require("../../../data-util/production/finishing-printing/inspection-lot-color-data-util"),
    validator: require("dl-models").validator.production.finishingPrinting.qualityControl.inspectionLotColor,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../../basic-test-factory");
basicTest(options); 