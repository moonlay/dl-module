var options = {
    manager: require("../../../src/managers/garment-purchasing/customs-manager"),
    model: require("dl-models").garmentPurchasing.Customs,
    util: require("../../data-util/garment-purchasing/customs-data-util"),
    validator: require("dl-models").validator.garmentPurchasing.customs,
    createDuplicate: false,
    keys:[]
    // keys: ["refNo","no","customsDate","validateDate","supplierId"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);