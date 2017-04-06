require("should");
var WeavingSalesContract = require("../../data-util/sales/weaving-sales-contract-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.weavingSalesContract;
var moment = require('moment');

var WeavingSalesContractManager = require("../../../src/managers/sales/weaving-sales-contract-manager");
var weavingSalesContractManager = null;

//delete unitest data
var DLModels = require('dl-models');
var map = DLModels.map;
var MachineType = DLModels.master.MachineType;


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            weavingSalesContractManager = new WeavingSalesContractManager(db, {
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
    WeavingSalesContract.getNewData()
        .then((data) => weavingSalesContractManager.create(data))
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
    weavingSalesContractManager.getSingleById(createdId)
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
    info.buyerId = createdData.buyerId;
    info.comodityId = createdData.comodityId;
    info.salesContractNo = createdData.salesContractNo;
    info.dateFrom = createdData._createdDate;
    info.dateTo = createdData._createdDate;

    weavingSalesContractManager.getWeavingSalesContractReport(info)
        .then(result => {
            resultForExcelTest = result;
            var weavingSalesContract = result.data;
            weavingSalesContract.should.instanceof(Array);
            weavingSalesContract.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});


it('#04. should success when get data for Excel Report', function (done) {
    var query = {};

    weavingSalesContractManager.getXls(resultForExcelTest, query)
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
    weavingSalesContractManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
