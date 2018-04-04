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
var buyer="buyer";
var code ="code";
var cancelStateCancelConfirm="Cancel Confirm";
var cancelStateCancelSisa="Cancel Sisa";
var cancelConfirmExpired="Expired";
// var bookingOrderMasterPlan="Sudah Dibuat Master Plan";
// var bookingOrderCanceled="Booking Dibatalkan";
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
    bookingOrderManager.getCanceledBookingOrderReport({"code" : code},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when get report with parameter buyer", function (done) {
    bookingOrderManager.getCanceledBookingOrderReport({"buyer" : buyer},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success when get report with parameter cancelStateCancelConfirm", function (done) {
    bookingOrderManager.getCanceledBookingOrderReport({"cancelState" : cancelStateCancelConfirm},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#04. should success when get report with parameter cancelStateCancelSisa", function (done) {
    bookingOrderManager.getCanceledBookingOrderReport({"cancelState" : cancelStateCancelSisa},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#05. should success when get report with parameter cancelConfirmExpired", function (done) {
    bookingOrderManager.getCanceledBookingOrderReport({"cancelState" : cancelConfirmExpired},offset)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it("#06. should success when get report with parameter datefrom and dateTo", function (done) {
    bookingOrderDataUtil.getReportData()
    .then((datas)=>{
        bookingOrderManager.getCanceledBookingOrderReport({dateFrom,dateTo},offset)
            .then((data) => {
                data.should.instanceof(Array);
                var result = {
                    data : data
                };
                bookingOrderManager.getCanceledBookingOrderReportXls(result, {dateFrom, dateTo},offset)
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

it("#07. should success when get report with no parameter and get excel", function (done) {
    bookingOrderDataUtil.getReportData()
    .then((datas)=>{
        bookingOrderManager.getCanceledBookingOrderReport({},offset)
            .then((data) => {
                data.should.instanceof(Array);
                var result = {
                    data : data
                };
                bookingOrderManager.getCanceledBookingOrderReportXls(result, {},offset)
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
