var options = {
    manager: require("../../../src/managers/inventory-textile/textile-inventory-summary-manager"),
    model: require("dl-models").inventoryTextile.TextileInventorySummary,
    util: require("../../data-util/inventory-textile/textile-inventory-summary-data-util"),
    validator: require("dl-models").validator.inventoryTextile.textileInventorySummary,
    createDuplicate: false,
    keys: ["productId", "storageId", "uomId"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options); 