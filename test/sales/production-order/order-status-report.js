require("should");

var dailyOperationDataUtil = require("../../data-util/production/finishing-printing/daily-operation-data-util");
var shipmentDocumentDataUtil = require("../../data-util/inventory/finishing-printing/fp-shipment-document-data-util");
var orderStatusHistoryDataUtil = require("../../data-util/sales/order-status-historical-data-util");

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

var productionOrderNo;
it("#01. should success when get daily operation data", function (done) {
    dailyOperationDataUtil.getNewWhiteOrderTypeData("input")
        .then((result) => {
            productionOrderNo = result.kanban.productionOrder.orderNo;
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

    manager.getOrderStatusReport(query, 7)
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

    manager.getOrderStatusReport(query, 7)
        .then((result) => {
            done();
        }).catch((e) => {
            done(e);
        });
});

it('#07. should success when create report', function (done) {

    query.orderType = "WHITE";
    query.year = moment().format('YYYY');

    manager.getOrderStatusReport(query, 7)
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

it('#08. should success when create report detail', function (done) {

    query.orderType = "";
    query.year = moment().year();
    // query.month = moment().month();

    manager.getOrderStatusDetailReport(query, 7)
        .then((result) => {
            done();
        }).catch((e) => {
            done(e);
        });
});

it('#09. should success when create report detail', function (done) {

    query.orderType = "WHITE";
    query.year = moment().year();
    query.month = moment().month();

    manager.getOrderStatusDetailReport(query, 7)
        .then((result) => {
            done();
        }).catch((e) => {
            done(e);
        });
});

it('#10. should success when create report detail', function (done) {

    query.orderType = "";
    query.year = moment().year();
    query.month = moment().month();

    manager.getOrderStatusDetailReport(query, 7)
        .then((result) => {
            resultForExcelTest.data = result;
            done();
        }).catch((e) => {
            done(e);
        });
});

it('#11. should success when create report detail', function (done) {

    query.orderType = "PRINTING";
    query.year = moment().year();
    query.month = moment().month();

    manager.getOrderStatusDetailReport(query, 7)
        .then((result) => {
            done();
        }).catch((e) => {
            done(e);
        });
});

it('#12. should success when get data detail for Excel Report', function (done) {

    manager.getOrderStatusDetailXls(resultForExcelTest, query, 0)
        .then((xlsData) => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#12. should success when get data detail for Excel Report', function (done) {
    var test={
        data:[{}]
    }
        manager.getOrderStatusDetailXls(test, query, 0)
            .then((xlsData) => {
                xlsData.should.have.property('data');
                xlsData.should.have.property('options');
                xlsData.should.have.property('name');
                done();
            }).catch(e => {
                done(e);
            });
    });

it('#13. should success when create report detail', function (done) {

    query.orderNo = productionOrderNo;

    orderStatusHistoryDataUtil.createTestData(productionOrderNo)
        .then(() => {
            manager.getOrderStatusKanbanDetailReport(query)
                .then((result) => {
                    resultForExcelTest.data = result;
                    done();
                }).catch((e) => {
                    done(e);
                });
        });
});

it('#14. should success when get data detail for Excel Report', function (done) {

    manager.getOrderStatusKanbanDetailXls(resultForExcelTest, query, 0)
        .then((xlsData) => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it("#15. should success when read data", function (done) {
    manager.read({
        "keyword": "TEST"
    })
        .then((documents) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});