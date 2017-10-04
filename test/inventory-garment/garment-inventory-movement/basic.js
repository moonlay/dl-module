var options = {
    manager: require("../../../src/managers/inventory-garment/garment-inventory-movement-manager"),
    model: require("dl-models").garmentInventory.garmentInventoryMovement,
    util: require("../../data-util/inventory-garment/garment-inventory-movement-data-util"),
    validator: require("dl-models").validator.garmentInventory.garmentInventoryMovement,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options); 