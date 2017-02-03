var options = {
    manager: require("../../../../src/managers/production/finishing-printing/monitoring-specification-machine-manager"),
    model: require("dl-models").production.finishingPrinting.MonitoringSpecificationMachine,
    util: require("../../../data-util/production/finishing-printing/monitoring-specification-machine-data-util"),
    validator: require("dl-models").validator.production.finishingPrinting.monitoringSpecificationMachine,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../../basic-test-factory");
basicTest(options); 