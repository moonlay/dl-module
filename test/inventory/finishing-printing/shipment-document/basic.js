var options = {
    manager: require("../../../../src/managers/inventory/finishing-printing/fp-shipment-document-manager"),
    model: require("dl-models").inventory.finishingPrinting.FPShipmentDocument,
    util: require("../../../data-util/inventory/finishing-printing/fp-shipment-document-data-util"),
    validator: require("dl-models").validator.inventory.finishingPrinting.fpShipmentDocument,
    createDuplicate: false,
    keys: ["code"]
};

var basicTest = require("../../../basic-test-factory");
basicTest(options);