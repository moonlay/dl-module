var options = {
    manager: require("../../../../src/managers/production/finishing-printing/fabric-quality-control-manager"),
    model: require("dl-models").production.finishingPrinting.qualityControl.defect.FabricQualityControl,
    util: require("../../../data-util/production/finishing-printing/fabric-quality-control-data-util"),
    validator: require("dl-models").validator.production.finishingPrinting.qualityControl.defect.fabricQualityControl,
    createDuplicate: false,
    keys: ["code"]
};

var basicTest = require("../../../basic-test-factory");
basicTest(options); 