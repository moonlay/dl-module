describe("BASIC CRUD SCENARIOS", function() {
    require("./basic");
});

describe("VALIDATION SCENARIOS", function() {
    require("./validate");
});

describe("CANCEL BOOKING SCENARIOS", function() {
    require("./cancel-booking");
});

describe("EXPIRED BOOKING SCENARIOS", function() {
    require("./expired-booking");
});

describe("CONFIRM BOOKING SCENARIOS", function() {
    require("./confirm");
});

describe("MONITORING BOOKING SCENARIOS", function() {
    require("./report");
});

describe("MONITORING CANCELED BOOKING SCENARIOS", function() {
    require("./cancel-booking-report");
});