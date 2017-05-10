require("should");
var Packing = require('../../../data-util/production/finishing-printing/packing-data-util');
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.qualityControl.packing;
var moment = require('moment');

var PackingManager = require("../../../../src/managers/production/finishing-printing/packing-manager");
var packingManager = null;


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            packingManager = new PackingManager(db, {
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
    Packing.getNewData()
        .then((data) => packingManager.create(data))
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
    packingManager.getSingleById(createdId)
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
    info.code = createdData._id;
    info.productionOrderNo = createdData.productionOrderId;
    info.dateFrom = createdData.date;
    // info.dateTo = new Date(createdData.date);
    info.dateTo = createdData.date.toISOString().split("T", "1").toString();

    packingManager.getPackingReport(info)
        .then(result => {
            resultForExcelTest = result;
            var packing = result.data;
            packing.should.instanceof(Array);
            packing.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});


it('#04. should success when get data for Excel Report', function (done) {
    var query = {};

    packingManager.getXls(resultForExcelTest, query)
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
    packingManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
