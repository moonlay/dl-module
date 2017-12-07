var options = {
    manager: require("../../../src/managers/garment-master-plan/booking-order-manager"),
    model: require("dl-models").garmentMasterPlan.BookingOrder,
    util: require("../../data-util/garment-master-plan/booking-order-data-util"),
    validator: require("dl-models").validator.garmentMasterPlan.bookingOrder,
    createDuplicate: false,
    keys:[]
};

var basicTest = require("../../basic-test-factory");
basicTest(options);