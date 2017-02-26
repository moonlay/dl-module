var options = { 
    manager: require("../../../src/managers/sales/production-order-manager"), 
    model: require("dl-models").sales.productionOrder, 
    util: require("../../data-util/sales/production-order-data-util"), 
    validator: require("dl-models").validator.sales.productionOrder, 
    createDuplicate: true, 
    keys: ["orderNo"] 
}; 
 
var basicTest = require("../../basic-test-factory"); 
basicTest(options);