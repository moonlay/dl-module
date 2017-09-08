var options = {
    manager: require("../../../src/managers/garment-purchasing/purchase-price-correction-manager"),
    model: require("dl-models").garmentPurchasing.GarmentPurchaseCorrection,
    util: require("../../data-util/garment-purchasing/purchase-price-correction-data-util"),
    validator: require("dl-models").validator.garmentPurchasing.garmentPurchaseCorrection,
    createDuplicate: false,
    keys: ["no"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
