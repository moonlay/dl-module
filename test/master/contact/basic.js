var options = {
    manager: require("../../../src/managers/master/contact-manager"),
    model: require("dl-models").master.Contact,
    util: require("../../data-util/master/contact-data-util"),
    validator: require("dl-models").validator.master.contact,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
