var options = {
    manager: require("../../../src/managers/garment-purchasing/garment-currency-manager"),
    model: require("dl-models").garmentPurchasing.GarmentCurrency,
    util: require("../../data-util/garment-purchasing/garment-currency-data-util"),
    validator: require("dl-models").validator.garmentPurchasing.garmentCurrency,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);