var options = {
    manager: require("../../../src/managers/inventory-textile/textile-inventory-document-manager"),
    model: require("dl-models").inventoryTextile.TextileInventoryDocument,
    util: require("../../data-util/inventory-textile/textile-inventory-document-data-util"),
    validator: require("dl-models").validator.inventoryTextile.textileInventoryDocument,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options); 