var options = {
    manager: require("../../../src/managers/inventory/inventory-movement-manager"),
    model: require("dl-models").inventory.InventoryMovement,
    util: require("../../data-util/inventory/inventory-movement-data-util"),
    validator: require("dl-models").validator.inventory.inventoryMovement,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options); 