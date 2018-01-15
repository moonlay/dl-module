var options = {
    manager: require("../../../src/managers/inventory/inventory-summary-manager"),
    model: require("dl-models").inventory.InventorySummary,
    util: require("../../data-util/inventory/inventory-summary-data-util"),
    validator: require("dl-models").validator.inventory.inventorySummary,
    createDuplicate: false,
    keys: ["productId", "storageId", "uomId"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options); 