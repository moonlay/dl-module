var should = require('should');
var helper = require("../../helper");
var PurchaseOrderExternalManager = require("../../../src/managers/garment-purchasing/purchase-order-external-manager");
var purchaseOrderExternalManager = null;
var purchaseOrderExternalDataUtil = require("../../data-util/garment-purchasing/purchase-order-external-data-util");
var purchaseOrderDataUtil = require("../../data-util/garment-purchasing/purchase-order-data-util");
var validatePO = require("dl-models").validator.garmentPurchasing.garmentPurchaseOrderExternal;
var instanceManager = null;
var moment = require('moment');
var dateNow;
var dateBefore;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new PurchaseOrderExternalManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should success when get report with no parameter and get excel", function (done) {
    instanceManager.getPOExtReport({})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            instanceManager.getPOExtReportXls(result, {})
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

it("#02. should success when get report with parameter dateFrom", function (done) {
    instanceManager.getPOExtReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD')})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            instanceManager.getPOExtReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD')})
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

it("#03. should success when get report with parameter dateTo", function (done) {
    instanceManager.getPOExtReport({"dateTo":moment(dateNow).format('YYYY-MM-DD')})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            instanceManager.getPOExtReportXls(result, {"dateTo":moment(dateNow).format('YYYY-MM-DD')})
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
    instanceManager.getPOExtReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : data
            };
            instanceManager.getPOExtReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
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


it("#04. (2) should success when get report with parameter dateFrom and dateTo", function (done) {
    instanceManager.getPOExtReport({"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
        .then((data) => {
            data.should.instanceof(Array);
            var result = {
                data : [{}]
            };
            instanceManager.getPOExtReportXls(result, {"dateFrom":moment(dateBefore).format('YYYY-MM-DD'), "dateTo":moment(dateNow).format('YYYY-MM-DD')})
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

it('#05. should success when generate data to Excel Report with date', function (done) {
    var startdate = null;
    var enddate   = null;
    var offset=7;
    instanceManager.getAllData(startdate, enddate, offset)
    .then(result => {
        result.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });
});