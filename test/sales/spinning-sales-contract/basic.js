var options = { 
    manager: require("../../../src/managers/sales/spinning-sales-contract-manager"), 
    model: require("dl-models").sales.spinningSalesContract, 
    util: require("../../data-util/sales/spinning-sales-contract-data-util"), 
    validator: require("dl-models").validator.sales.spinningSalesContract, 
    createDuplicate: true, 
    keys: ["salesContractNo"] 
}; 
 
var basicTest = require("../../basic-test-factory"); 
basicTest(options);