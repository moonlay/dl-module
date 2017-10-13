var options = {
    manager: require("../../../src/managers/master/account-bank-manager"),
    model: require("dl-models").master.AccountBank,
    util: require("../../data-util/master/account-bank-data-util"),
    validator: require("dl-models").validator.master.accountBank,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../basic-test-factory");
basicTest(options);
 