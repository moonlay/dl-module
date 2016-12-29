var options = {
    manager: require("../../../src/managers/purchasing/unit-receipt-note-manager"),
    model: require("dl-models").purchasing.UnitReceiptNote,
    util: require("../../data-util/purchasing/unit-receipt-note-data-util"),
    validator: require("dl-models").validator.purchasing.unitReceiptNote,
    createDuplicate: false,
    keys: ["no"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
