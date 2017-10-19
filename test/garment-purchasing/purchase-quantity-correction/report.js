'use strict';

var helper = require("../../helper");
var validatorPurchasing = require('dl-models').validator.purchasing;
var PurchaseQuantityCorrectionManager = require("../../../src/managers/garment-purchasing/purchase-quantity-correction-manager");
var purchaseQuantityCorrectionManager = null;
var PurchaseQuantityCorrection = require('../../data-util/garment-purchasing/purchase-quantity-correction-data-util');
var moment = require('moment');
var dateNow;
var dateBefore;
var supplier;
var no;
var user = {username :"unit-test"};
var dataUtil= require("../../data-util/garment-purchasing/purchase-quantity-correction-data-util");
var should = require("should");


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseQuantityCorrectionManager = new PurchaseQuantityCorrectionManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;
it("#01. should success when create new data", function (done) {
        dataUtil.getNewData()
            .then((data) => purchaseQuantityCorrectionManager.create(data))
            .then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
            })
            .catch((e) => {
                done(e);
            });
    });

it("#02. should success when get report with parameter no", function (done) {
    purchaseQuantityCorrectionManager.getPurchaseQuantityCorrectionReport({"no" : no},user)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success when get report with parameter supplier", function (done) {
    purchaseQuantityCorrectionManager.getPurchaseQuantityCorrectionReport({"supplier" : supplier},user)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should success when get report with parameter dateFrom", function (done) {
    purchaseQuantityCorrectionManager.getPurchaseQuantityCorrectionReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD')},user)
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            purchaseQuantityCorrectionManager.getPurchaseQuantityCorrectionReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD')})
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
    purchaseQuantityCorrectionManager.getPurchaseQuantityCorrectionReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')},user)
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            purchaseQuantityCorrectionManager.getPurchaseQuantityCorrectionReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
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
    purchaseQuantityCorrectionManager.getPurchaseQuantityCorrectionReport({},user)
        .then((data) => {
           
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            purchaseQuantityCorrectionManager.getPurchaseQuantityCorrectionReportXls(result, {})
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






