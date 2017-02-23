var options = {
    manager: require("../../../../src/managers/production/finishing-printing/kanban-manager"),
    model: require("dl-models").production.finishingPrinting.Kanban,
    util: require("../../../data-util/production/finishing-printing/kanban-data-util"),
    validator: require("dl-models").validator.production.finishingPrinting.kanban,
    createDuplicate: true,
    keys: ["code"]
};

var basicTest = require("../../../basic-test-factory");
basicTest(options); 