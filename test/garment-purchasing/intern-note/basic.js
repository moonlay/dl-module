var options = {
    manager: require("../../../src/managers/garment-purchasing/intern-note-manager"),
    model: require("dl-models").garmentPurchasing.InternNote,
    util: require("../../data-util/garment-purchasing/intern-note-data-util"),
    validator: require("dl-models").validator.garmentPurchasing.garmentInternNote,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);