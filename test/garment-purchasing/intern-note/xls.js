var should = require('should');
var helper = require("../../helper");
var InternNoteManager = require("../../../src/managers/garment-purchasing/intern-note-manager");
var internNoteManager = null;
var DataUtil = require("../../data-util/garment-purchasing/intern-note-data-util");
var validate = require("dl-models").validator.garmentPurchasing.garmentInternNote;
var instanceManager = null;


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new InternNoteManager(db, {
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
    info.no = createdData.items[0].purchaseOrderExternalNo;
    info.supplierId = createdData.supplierId.toString();
    info.currency = createdData.currency._id.toString();
    info.dateFrom = createdData._createdDate.toISOString().split("T", "1").toString();
    info.dateTo = createdData._createdDate.toISOString().split("T", "1").toString();
    info.offset=0;
    //info.user="unit-test";

    instanceManager.getDataMonitoring(info)
        .then(result => {
            resultForExcelTest.data = result;
            var internNote = result;
            internNote.should.instanceof(Array);
            internNote.length.should.not.equal(0);
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
