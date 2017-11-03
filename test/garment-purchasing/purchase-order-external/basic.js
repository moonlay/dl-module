var options = {
    manager: require("../../../src/managers/garment-purchasing/purchase-order-external-manager"),
    model: require("dl-models").garmentPurchasing.GarmentPurchaseOrderExternal,
    util: require("../../data-util/garment-purchasing/purchase-order-external-data-util"),
    validator: require("dl-models").validator.garmentPurchasing.garmentPurchaseOrderExternal,
    createDuplicate: false,
    keys: ["no"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
