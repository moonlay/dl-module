var options = {
    manager: require("../../../../src/managers/production/finishing-printing/monitoring-event-manager"),
    model: require("dl-models").production.finishingPrinting.MonitoringEvent,
    util: require("../../../data-util/production/finishing-printing/monitoring-event-data-util"),
    validator: require("dl-models").validator.production.finishingPrinting.monitoringEvent,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../../basic-test-factory");
basicTest(options); 