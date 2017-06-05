var options = {
    manager: require("../../../src/managers/inventory/inventory-document-manager"),
    model: require("dl-models").inventory.InventoryDocument,
    util: require("../../data-util/inventory/inventory-document-data-util"),
    validator: require("dl-models").validator.inventory.inventoryDocument,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options); 