require("should");

var dailyOperationDataUtil = require("../../data-util/production/finishing-printing/daily-operation-data-util");
var shipmentDocumentDataUtil = require("../../data-util/inventory/finishing-printing/fp-shipment-document-data-util");

var helper = require("../../helper");
var validate = require("dl-models").validator;
var codeGenerator = require('../../../src/utils/code-generator');
var moment = require('moment');

var ProductionOrderManager = require("../../../src/managers/sales/production-order-manager");
var manager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new ProductionOrderManager(db, { username: 'dev' });
            done();
        })
        .catch(e => {
            done(e);
        });
});

// it("#01. should success when get all data", function (done) {
//     Promise.all([dailyOperationDataUtil.getNewWhiteOrderTypeData("input"), dailyOperationDataUtil.getNewPrintingOrderTypeData("input"), shipmentDocumentDataUtil.getNewWhiteOrderTypeData(), shipmentDocumentDataUtil.getNewPrintingOrderTypeData()])
//         .then((results) => {
//             done();
//         })
//         .catch(e => {
//             done(e);
//         });
// });


it("#01. should success when get daily operation data", function (done) {
    dailyOperationDataUtil.getNewWhiteOrderTypeData("input")
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#02. should success when get daily operation data", function (done) {
    dailyOperationDataUtil.getNewPrintingOrderTypeData("input")
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#03. should success when get shipment data", function (done) {
    shipmentDocumentDataUtil.getNewWhiteOrderTypeData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#04. should success when get shipment data", function (done) {
    shipmentDocumentDataUtil.getNewPrintingOrderTypeData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

var query = {};
var resultForExcelTest = {};
it('#05. should success when create report', function (done) {

    query.orderType = "";
    query.year = moment().format('YYYY');

    manager.getOrderStatusReport(query)
        .then((result) => {
            resultForExcelTest.data = result;
            done();
        }).catch(e => {
            done(e);
        });
});

it('#06. should success when create report', function (done) {

    query.orderType = "PRINTING";
    query.year = moment().format('YYYY');

    manager.getOrderStatusReport(query)
        .then((result) => {
            done();
        }).catch((e) => {
            done(e);
        });
});

it('#07. should success when create report', function (done) {

    query.orderType = "WHITE";
    query.year = moment().format('YYYY');

    manager.getOrderStatusReport(query)
        .then((result) => {
            done();
        }).catch((e) => {
            done(e);
        });
});

it('#08. should success when get data for Excel Report', function (done) {

    manager.getOrderStatusXls(resultForExcelTest, query)
        .then((xlsData) => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});