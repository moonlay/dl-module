'use strict';

var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorMasterPlan = require('dl-models').validator.garmentMasterPlan;
var BookingOrderManager = require("../../../src/managers/garment-master-plan/booking-order-manager");
var bookingOrderManager = null;
var bookingOrderManager = require("../../data-util/garment-master-plan/booking-order-data-util");
var moment = require('moment');
var dateNow;
var dateBefore;
var comodity;
var buyer;
var code;
var confirmState="isConfirmed";
var bookingOrderState="Booking";


require("should");


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            bookingOrderManager = new BookingOrderManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it("#01. should success when get report with parameter code", function (done) {
    bookingOrderManager.getBookingOrderReport({"code" : code})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when get report with parameter buyer", function (done) {
    bookingOrderManager.getBookingOrderReport({"code" : buyer})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#03. should success when get report with parameter comodity", function (done) {
    bookingOrderManager.getBookingOrderReport({"comodity" : comodity})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should success when get report with parameter confirm state", function (done) {
    bookingOrderManager.getBookingOrderReport({"confirmState" : confirmState})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#04. should success when get report with parameter booking order state", function (done) {
    bookingOrderManager.getBookingOrderReport({"bookingOrderState" : bookingOrderState})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#05. should success when get report with parameter dateFrom", function (done) {
    bookingOrderManager.getBookingOrderReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD')})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            bookingOrderManager.getBookingOrderReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD')})
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property('data');
                    xls.should.have.property('options');
                    xls.should.have.property('name');
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});
it("#06. should success when get report with parameter dateFrom and dateTo", function (done) {
    bookingOrderManager.getBookingOrderReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            bookingOrderManager.getBookingOrderReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property('data');
                    xls.should.have.property('options');
                    xls.should.have.property('name');
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should success when get report with no parameter and get excel", function (done) {
    bookingOrderManager.getBookingOrderReport({})
        .then((data) => {
           
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            bookingOrderManager.getBookingOrderReportXls(result, {})
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property('data');
                    xls.should.have.property('options');
                    xls.should.have.property('name');
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});
