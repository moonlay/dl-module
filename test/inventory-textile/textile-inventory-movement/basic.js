var options = {
    manager: require("../../../src/managers/inventory-textile/textile-inventory-movement-manager"),
    model: require("dl-models").inventoryTextile.TextileInventoryMovement,
    util: require("../../data-util/inventory-textile/textile-inventory-movement-data-util"),
    validator: require("dl-models").validator.inventoryTextile.textileInventoryMovement,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options); 