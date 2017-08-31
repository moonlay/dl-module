var options = {
    manager: require("../../../../src/managers/inventory/finishing-printing/fp-retur-fr-byr-doc-manager"),
    model: require("dl-models").inventory.finishingPrinting.FPReturFromBuyerDoc,
    util: require("../../../data-util/inventory/finishing-printing/fp-retur-fr-byr-doc-data-util"),
    validator: require("dl-models").validator.inventory.finishingPrinting.fpReturFromBuyerDoc,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../../basic-test-factory");
basicTest(options); 