var options = {
    manager: require("../../../src/managers/master/term-of-payment-manager"),
    model: require("dl-models").master.TermOfPayment,
    util: require("../../data-util/master/term-of-payment-data-util"),
    validator: require("dl-models").validator.master.termOfPayment,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
