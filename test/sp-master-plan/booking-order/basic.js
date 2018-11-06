var options = {
    manager: require("../../../src/managers/sp-master-plan/booking-order-manager"),
    model: require("dl-models").spMasterPlan.BookingOrder,
    util: require("../../data-util/sp-master-plan/booking-order-data-util"),
    validator: require("dl-models").validator.spMasterPlan.bookingOrder,
    createDuplicate: false,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);