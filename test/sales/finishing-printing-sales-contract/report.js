require("should");
var FinishingPrintingSalesContractDataUtil =  require("../../data-util/sales/finishing-printing-sales-contract-data-util");
var helper = require("../../helper");
var validate =require("dl-models").validator.sales.finishingPrintingSalesContract;
var moment = require('moment');

var FinishingPrintingSalesContractManager = require("../../../src/managers/sales/finishing-printing-sales-contract-manager");
var finishingPrintingSalesContractManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            finishingPrintingSalesContractManager = new FinishingPrintingSalesContractManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdData;
var createdId;
it("#01. should success when create new data", function(done) {
    FinishingPrintingSalesContractDataUtil.getNewData()
    .then((data) =>{
        createdData=data;
        finishingPrintingSalesContractManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
    });
});

it('#02. should success when get Finishing Printing Sales Contract data with salesContractNo', function (done) {
    var query = {};
    query.salesContractNo = createdData.salesContractNo;

    finishingPrintingSalesContractManager.getReport(query)
        .then(result => {
            var sc = result;
            sc.should.instanceof(Array);
            sc.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#03. should success when get Finishing Printing Sales Contract data with orderType', function (done) {
    var query = {};
    query.orderTypeId = createdData.orderTypeId;

    finishingPrintingSalesContractManager.getReport(query)
        .then(result => {
            var sc = result;
            sc.should.instanceof(Array);
            sc.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#04. should success when get Finishing Printing Sales Contract data with comodityId', function (done) {
    var query = {};
    query.comodityId = createdData.comodityId;

    finishingPrintingSalesContractManager.getReport(query)
        .then(result => {
            var sc = result;
            sc.should.instanceof(Array);
            sc.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#05. should success when get Finishing Printing Sales Contract data with buyerId', function (done) {
    var query = {};
    query.buyerId = createdData.buyerId;

    finishingPrintingSalesContractManager.getReport(query)
        .then(result => {
            var sc = result;
            sc.should.instanceof(Array);
            sc.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#06. should success when get Finishing Printing Sales Contract data with Start Date', function (done) {
    var query = {};
    query.sdate = createdData._createdDate;

    finishingPrintingSalesContractManager.getReport(query)
        .then(result => {
            var sc = result;
            sc.should.instanceof(Array);
            sc.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#07. should success when get Finishing Printing Sales Contract data with End Date', function (done) {
    var query = {};
    query.edate = createdData._createdDate;

    finishingPrintingSalesContractManager.getReport(query)
        .then(result => {
            var sc = result;
            sc.should.instanceof(Array);
            sc.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

var resultForExcelTest = {};
it('#08. should success when get Finishing Printing Sales Contract data with all filter', function (done) {
    var query = {};
    query.edate = createdData._createdDate;
    query.sdate = createdData._createdDate;
    query.buyerId = createdData.buyerId;
    query.comodityId = createdData.comodityId;
    query.orderTypeId = createdData.orderTypeId;
    query.salesContractNo = createdData.salesContractNo;

    finishingPrintingSalesContractManager.getReport(query)
        .then(result => {
            resultForExcelTest.info = result;
            var sc = result;
            sc.should.instanceof(Array);
            sc.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#09. should success when get data for Excel Report', function (done) {
    var query = {};

    finishingPrintingSalesContractManager.getXls(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it("#10. should success when destroy all unit test data", function(done) {
    finishingPrintingSalesContractManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});