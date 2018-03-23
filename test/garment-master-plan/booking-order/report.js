'use strict';

var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorMasterPlan = require('dl-models').validator.garmentMasterPlan;
var BookingOrderManager = require("../../../src/managers/garment-master-plan/booking-order-manager");
var bookingOrderManager = null;
var bookingOrderDataUtil = require("../../data-util/garment-master-plan/booking-order-data-util");
var moment = require('moment');
var dateFrom=new Date("2018-01-02")
var dateTo=new Date("2018-01-10");
var comodity="comodity";
var section="section";
var buyer="buyer";
var code ="code";
var isconfirmState="Sudah Dikonfirmasi";
var notconfirmState="Belum Dikonfirmasi";
var bookingOrderBooking="Booking";
var bookingOrderMasterPlan="Sudah Dibuat Master Plan";
var bookingOrderCanceled="Booking Dibatalkan";
var bookingOrderConfirmed="Confirmed";
var offset=7;

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
    bookingOrderManager.getBookingOrderReport({"code" : code},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when get report with parameter buyer", function (done) {
    bookingOrderManager.getBookingOrderReport({"buyer" : buyer},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#03. should success when get report with parameter comodity", function (done) {
    bookingOrderManager.getBookingOrderReport({"comodity" : comodity},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should success when get report with parameter section", function (done) {
    bookingOrderManager.getBookingOrderReport({"section" : section},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should success when get report with parameter isconfirmstate", function (done) {
    bookingOrderManager.getBookingOrderReport({"confirmState" : isconfirmState},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#06. should success when get report with parameter notconfirmstate", function (done) {
    bookingOrderManager.getBookingOrderReport({"confirmState" : notconfirmState},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#07. should success when get report with parameter booking order state :Booking", function (done) {
    bookingOrderManager.getBookingOrderReport({"bookingOrderState" : bookingOrderBooking},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#08. should success when get report with parameter booking order state : Sudah dibuat Master Plan", function (done) {
    bookingOrderManager.getBookingOrderReport({"bookingOrderState" : bookingOrderMasterPlan},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#09. should success when get report with parameter booking order state : Booking Dibatalkan", function (done) {
    bookingOrderManager.getBookingOrderReport({"bookingOrderState" : bookingOrderCanceled},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#10. should success when get report with parameter booking order state : Confirmed", function (done) {
    bookingOrderManager.getBookingOrderReport({"bookingOrderState" : bookingOrderConfirmed},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});



it("#11. should success when get report with parameter datefrom and dateTo", function (done) {
    bookingOrderDataUtil.getReportData()
    .then((datas)=>{
        bookingOrderManager.getBookingOrderReport({dateFrom,dateTo},offset)
            .then((data) => {
                data.should.instanceof(Array);
                var result = {
                    data : data
                };
                bookingOrderManager.getBookingOrderReportXls(result, {dateFrom, dateTo},offset)
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

});

it("#12. should success when get report with no parameter and get excel", function (done) {
    bookingOrderDataUtil.getReportData()
    .then((datas)=>{
        bookingOrderManager.getBookingOrderReport({},offset)
            .then((data) => {
                data.should.instanceof(Array);
                var result = {
                    data : data
                };
                bookingOrderManager.getBookingOrderReportXls(result, {},offset)
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

});
