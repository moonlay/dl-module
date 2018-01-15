var options = {
    manager: require("../../../src/managers/garment-purchasing/unit-receipt-note-manager"),
    model: require("dl-models").garmentPurchasing.UnitReceiptNote,
    util: require("../../data-util/garment-purchasing/unit-receipt-note-data-util"),
    validator: require("dl-models").validator.garmentPurchasing.garmentUnitReceiptNote,
    createDuplicate: false,
    keys: ["no"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
