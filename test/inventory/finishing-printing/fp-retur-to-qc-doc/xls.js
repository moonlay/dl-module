require("should");
var DataUtil = require("../../../data-util/inventory/finishing-printing/fp-retur-to-qc-doc-data-util");
var helper = require("../../../helper");
var validate = require("dl-models").validator.inventory.finishingPrinting.fpReturToQCDoc;
var moment = require('moment');

var Manager = require("../../../../src/managers/inventory/finishing-printing/fp-retur-to-qc-doc-manager");
var instanceManager = null;


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new Manager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId;
it("#01. should success when create new data", function (done) {
    DataUtil.getNewData()
        .then((data) => instanceManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdData;
it(`#02. should success when get created data with id`, function (done) {
    instanceManager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            validate(data);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});


var resultForExcelTest = {};
it('#03. should success when create report', function (done) {
    var info = {};
    info.returNo = createdData.returNo;
    info.destination = createdData.destination;
    info.productionOrderNo = createdData.productionOrderNo;
    info.deliveryOrderNo = createdData.deliveryOrderNo;
    info.dateFrom = createdData._createdDate;
    info.dateTo = createdData._createdDate.toISOString().split("T", "1").toString();

    instanceManager.getReturReport(info)
        .then(result => {
            resultForExcelTest = result;
            var retur = result.data;
            retur.should.instanceof(Array);
            retur.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});


it('#04. should success when get data for Excel Report', function (done) {
    var query = {};

    instanceManager.getXls(resultForExcelTest, query)
        .then(xlsData => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});


it("#05. should success when destroy all unit test data", function (done) {
    instanceManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
