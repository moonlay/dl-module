'use strict';

var should = require('should');
var helper = require("../../helper");
var CustomsManager = require("../../../src/managers/garment-purchasing/customs-manager");
var customsManager = null;
var customsDataUtil = require("../../data-util/garment-purchasing/customs-data-util");
var validate = require("dl-models").validator.garmentPurchasing.customs;
var moment = require('moment');
var dateNow;
var dateBefore;
var supplier;
var no;
var customsType;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            customsManager = new CustomsManager(db, {
                username: 'unit-test'
            });
            dateNow = new Date();
            dateBefore = new Date();
            dateBefore = dateBefore.setDate(dateBefore.getDate() + 2);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it("#01. should success when input data", function (done) {
    customsDataUtil.getNewData()
        .then((data) => {
            supplier = data.supplier;
            customsType = data.customsType;
            no = data.no;
            customsManager.create(data)
                .then((id) => {
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

it("#02. should success when get report with no parameter and get excel", function (done) {
    customsManager.getCustomsReport({})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            customsManager.getCustomsReportXls(result, {})
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

it("#03. should success when get report with parameter dateFrom", function (done) {
    customsManager.getCustomsReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD')})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            customsManager.getCustomsReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD')})
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

it("#04. should success when get report with parameter dateTo", function (done) {
    customsManager.getCustomsReport({"dateTo":moment(dateNow).format('YYYY-MM-DD')})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            customsManager.getCustomsReportXls(result, {"dateTo":moment(dateNow).format('YYYY-MM-DD')})
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
    customsManager.getCustomsReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            customsManager.getCustomsReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
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

it("#06. should success when get report with parameter supplier", function (done) {
    customsManager.getCustomsReport({"supplier" : supplier._id})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#07. should success when get report with parameter customsType", function (done) {
    customsManager.getCustomsReport({"customsType" : customsType})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#08. should success when get report with parameter no", function (done) {
    customsManager.getCustomsReport({"no" : no})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#09. should success when generate data to Excel Report with date', function (done) {
    var startdate = null;
    var enddate   = null;
    var offset=7;
    customsManager.getAllData(startdate, enddate)
    .then(result => {
        result.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });
});