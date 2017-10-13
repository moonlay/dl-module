var options = {
    manager: require("../../../src/managers/master/company-manager"),
    model: require("dl-models").master.Company,
    util: require("../../data-util/master/company-data-util"),
    validator: require("dl-models").validator.master.company,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
