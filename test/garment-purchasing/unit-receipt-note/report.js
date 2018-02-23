'use strict';

var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitReceiptNoteManager = require("../../../src/managers/garment-purchasing/unit-receipt-note-manager");
var unitReceiptNoteManager = null;
var unitReceiptNote = require("../../data-util/garment-purchasing/unit-receipt-note-data-util");
var moment = require('moment');
var dateNow;
var dateBefore;
var supplier;
var unit;
var no;
var user = {username :"unit-test"};

require("should");


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            unitReceiptNoteManager = new UnitReceiptNoteManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it("#01. should success when get report with parameter no", function (done) {
    unitReceiptNoteManager.getUnitReceiptReport({"no" : no},user)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#02. should success when get report with parameter unit", function (done) {
    unitReceiptNoteManager.getUnitReceiptReport({"unit" : unit},user)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#03. should success when get report with parameter supplier", function (done) {
    unitReceiptNoteManager.getUnitReceiptReport({"supplier" : supplier},user)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should success when get report with parameter dateFrom", function (done) {
    unitReceiptNoteManager.getUnitReceiptReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD')},user)
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            unitReceiptNoteManager.getUnitReceiptReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD')})
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
it("#05. should success when get report with parameter dateFrom and dateTo", function (done) {
    unitReceiptNoteManager.getUnitReceiptReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')},user)
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            unitReceiptNoteManager.getUnitReceiptReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
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
    unitReceiptNoteManager.getUnitReceiptReport({},user)
        .then((data) => {
           
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            unitReceiptNoteManager.getUnitReceiptReportXls(result, {})
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

it('#07. should success when generate data to Excel Report with date', function (done) {
    var startdate = null;
    var enddate   = null;
    var offset=7;
    unitReceiptNoteManager.getAllData(startdate, enddate, offset)
    .then(result => {
        result.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });
});

var resultForExcelTest = {};
it('#08. should success when create report', function (done) {
    var info = {};
       
    unitReceiptNoteManager.getUnitReceiptAllReport(info)
        .then(result => {
             result.should.instanceof(Object);
            done();
        }).catch(e => {
            done(e);
        });
});

it("#09. should success when get report with no parameter and get excel", function (done) {
    unitReceiptNoteManager.getUnitReceiptAllReport({})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            unitReceiptNoteManager.getUnitReceiptAllReportXls(result, {})
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






