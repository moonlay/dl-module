var options = {
    manager: require("../../../src/managers/garment-purchasing/delivery-order-manager"),
    model: require("dl-models").garmentPurchasing.GarmentDeliveryOrder,
    util: require("../../data-util/garment-purchasing/delivery-order-data-util"),
    validator: require("dl-models").validator.garmentPurchasing.garmentDeliveryOrder,
    createDuplicate: false,
    keys: ["refNo"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
