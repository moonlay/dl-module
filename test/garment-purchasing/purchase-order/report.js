require("should");
var dataUtil = require("../../data-util/garment-purchasing/purchase-order-data-util");
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
it("#01. should success when create new data", function (done) {
    dataUtil.getNewData()
        .then((data) => manager.create(data))
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
    manager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            validatePO(data);
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
    info.no = createdData._id;
    info.buyer = createdData.buyerId;
    info.category=createdData.items[0].categoryId;
    info.unit=createdData.unitId;
    info.dateFrom = createdData._createdDate;
    info.dateTo = createdData._createdDate.toISOString().split("T", "1").toString();

    manager.getReport(info)
        .then(result => {
            resultForExcelTest = result;
            var PO = result.data;
            PO.should.instanceof(Array);
            PO.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});


it('#04. should success when get data for Excel Report', function (done) {
    var query = {};

    manager.getXls(resultForExcelTest, query)
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
