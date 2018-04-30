require("should");
var dataUtil = require("../../data-util/garment-purchasing/intern-note-data-util");
var helper = require("../../helper");
var validatePO = require("dl-models").validator.garmentPurchasing.garmentPurchaseOrder;
var moment = require('moment');

var Manager = require("../../../src/managers/garment-purchasing/purchase-order-manager");
var manager = null;


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId;
var createdData;
it("#01. should success when create new data", function (done) {
    dataUtil.getNewTestData()
        .then((data) => {
            manager.getSingleByIdOrDefault(data.items[0].items[0].items[0].purchaseOrderId)
                .then((purchaseOrderInternal) => {
                    createdData = purchaseOrderInternal;
                    done();
                })
        })
        .catch((e) => {
            done(e);
        });
});

var resultForExcelTest = {};
it('#02. should success when create report', function (done) {
    var info = {};
    info.purchaseOrderExternalNo = createdData.items[0].purchaseOrderExternal.no;
    info.supplierId = createdData.items[0].supplierId;
    info.category = createdData.items[0].categoryId;
    info.unit = createdData.unitId;
    info.refNo = createdData.items[0].refNo;
    info.artikel = createdData.artikel;
    info.dateFrom = createdData.date;
    info.dateTo = new Date();
    info.dateTo.setDate(createdData.date.getDate() + 5);

    manager.getPurchaseReport(info)
        .then(result => {
            resultForExcelTest = result;
            var POdata = result.data;
            POdata.should.instanceof(Array);
            POdata.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#03. should success when get data for Excel Report', function (done) {
    var query = {};

    manager.getXlsPurchaseReport(resultForExcelTest, query)
        .then(xlsData => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});


it("#04. should success when destroy all unit test data", function (done) {
    manager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var resultForExcelTest = {};
it('#05. should success when create report', function (done) {
    var info = {};
    info.purchaseOrderExternalNo = createdData.items[0].purchaseOrderExternal.no;
    info.supplierId = createdData.items[0].supplierId;
    info.category = createdData.items[0].categoryId;
    info.unit = createdData.unitId;
    info.refNo = createdData.items[0].refNo;
    info.artikel = createdData.artikel;
    info.username = createdData._createdBy;
    info.dateFrom = createdData.date;
    info.dateTo = new Date();
    info.dateTo.setDate(createdData.date.getDate() + 5);

    manager.getPurchaseReportAll(info)
        .then(result => {
            resultForExcelTest = result;
            var POdata = result.data;
            POdata.should.instanceof(Array);
            POdata.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#06. should success when get data for Excel Report', function (done) {
    var query = {};

    manager.getXlsPurchaseReportAll(resultForExcelTest, query)
        .then(xlsData => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});