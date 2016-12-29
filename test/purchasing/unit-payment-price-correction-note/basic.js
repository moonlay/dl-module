var options = {
    manager: require("../../../src/managers/purchasing/unit-payment-price-correction-note-manager"),
    model: require("dl-models").purchasing.UnitPaymentCorrectionNote,
    util: require("../../data-util/purchasing/unit-payment-price-correction-note-data-util"),
    validator: require("dl-models").validator.purchasing.unitPaymentCorrectionNote,
    createDuplicate: false,
    keys: ["no"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
