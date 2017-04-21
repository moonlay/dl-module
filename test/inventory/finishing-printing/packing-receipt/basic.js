var options = {
    manager: require("../../../../src/managers/inventory/finishing-printing/fp-packing-receipt-manager"),
    model: require("dl-models").inventory.finishingPrinting.PackingReceipt,
    util: require("../../../data-util/inventory/finishing-printing/fp-packing-receipt-data-util"),
    validator: require("dl-models").validator.inventory.finishingPrinting.fpPackingReceipt,
    createDuplicate: false,
    keys: ["code"]
};

var basicTest = require("../../../basic-test-factory");
basicTest(options); 