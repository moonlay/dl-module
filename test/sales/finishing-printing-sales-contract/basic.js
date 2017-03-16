var options = { 
    manager: require("../../../src/managers/sales/finishing-printing-sales-contract-manager"), 
    model: require("dl-models").sales.finishingPrintingSalesContract, 
    util: require("../../data-util/sales/finishing-printing-sales-contract-data-util"), 
    validator: require("dl-models").validator.sales.finishingPrintingSalesContract, 
    createDuplicate: true, 
    keys: ["salesContractNo"] 
}; 
 
var basicTest = require("../../basic-test-factory"); 
basicTest(options);