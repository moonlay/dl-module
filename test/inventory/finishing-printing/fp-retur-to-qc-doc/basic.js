var options = {
    manager: require("../../../../src/managers/inventory/finishing-printing/fp-retur-to-qc-doc-manager"),
    model: require("dl-models").inventory.finishingPrinting.FPReturToQCDoc,
    util: require("../../../data-util/inventory/finishing-printing/fp-retur-to-qc-doc-data-util"),
    validator: require("dl-models").validator.inventory.finishingPrinting.fpReturToQCDoc,
    createDuplicate: false,
    keys: ["returNo"]
};

var basicTest = require("../../../basic-test-factory");
basicTest(options); 