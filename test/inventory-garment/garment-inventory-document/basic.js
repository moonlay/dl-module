var options = {
    manager: require("../../../src/managers/inventory-garment/garment-inventory-document-manager"),
    model: require("dl-models").garmentInventory.garmentInventoryDocument,
    util: require("../../data-util/inventory-garment/garment-inventory-document-data-util"),
    validator: require("dl-models").validator.garmentInventory.garmentInventoryDocument,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options); 