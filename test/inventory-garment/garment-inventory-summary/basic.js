var options = {
    manager: require("../../../src/managers/inventory-garment/garment-inventory-summary-manager"),
    model: require("dl-models").garmentInventory.garmentInventorySummary,
    util: require("../../data-util/inventory-garment/garment-inventory-summary-data-util"),
    validator: require("dl-models").validator.garmentInventory.garmentInventorySummary,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options); 