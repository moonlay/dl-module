var options = { 
    manager: require("../../../src/managers/sales/weaving-sales-contract-manager"), 
    model: require("dl-models").sales.weavingSalesContract, 
    util: require("../../data-util/sales/weaving-sales-contract-data-util"), 
    validator: require("dl-models").validator.sales.weavingSalesContract, 
    createDuplicate: true, 
    keys: ["salesContractNo"] 
}; 
 
var basicTest = require("../../basic-test-factory"); 
basicTest(options);