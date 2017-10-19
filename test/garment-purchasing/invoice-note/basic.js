var options = {
    manager: require("../../../src/managers/garment-purchasing/invoice-note-manager"),
    model: require("dl-models").garmentPurchasing.GarmentInvoiceNote,
    util: require("../../data-util/garment-purchasing/invoice-note-data-util"),
    validator: require("dl-models").validator.garmentPurchasing.garmentInvoiceNote,
    createDuplicate: false,
    keys: ["refNo"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
