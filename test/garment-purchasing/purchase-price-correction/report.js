'use strict';

var helper = require("../../helper");
var validatorPurchasing = require('dl-models').validator.purchasing;
var PurchasePriceCorrectionManager = require("../../../src/managers/garment-purchasing/purchase-price-correction-manager");
var purchasePriceCorrectionManager = null;
var PurchasePriceCorrection = require('../../data-util/garment-purchasing/purchase-price-correction-data-util');
var moment = require('moment');
var dateNow;
var dateBefore;
var supplier;
var no;
var user = {username :"unit-test"};

require("should");


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchasePriceCorrectionManager = new PurchasePriceCorrectionManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it("#01. should success when get report with parameter no", function (done) {
    purchasePriceCorrectionManager.getPurchasePriceCorrectionReport({"no" : no},user)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when get report with parameter supplier", function (done) {
    purchasePriceCorrectionManager.getPurchasePriceCorrectionReport({"supplier" : supplier},user)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success when get report with parameter dateFrom", function (done) {
    purchasePriceCorrectionManager.getPurchasePriceCorrectionReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD')},user)
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            purchasePriceCorrectionManager.getPurchasePriceCorrectionReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD')})
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
it("#04. should success when get report with parameter dateFrom and dateTo", function (done) {
    purchasePriceCorrectionManager.getPurchasePriceCorrectionReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')},user)
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            purchasePriceCorrectionManager.getPurchasePriceCorrectionReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
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

it("#05. should success when get report with no parameter and get excel", function (done) {
    purchasePriceCorrectionManager.getPurchasePriceCorrectionReport({},user)
        .then((data) => {
           
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            purchasePriceCorrectionManager.getPurchasePriceCorrectionReportXls(result, {})
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






