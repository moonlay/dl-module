require("should");
var SpinningSalesContract = require("../../data-util/sales/spinning-sales-contract-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.spinningSalesContract;
var moment = require('moment');

var SpinningSalesContractManager = require("../../../src/managers/sales/spinning-sales-contract-manager");
var spinningSalesContractManager = null;


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            spinningSalesContractManager = new SpinningSalesContractManager(db, {
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
    SpinningSalesContract.getNewData()
        .then((data) => spinningSalesContractManager.create(data))
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
    spinningSalesContractManager.getSingleById(createdId)
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

    spinningSalesContractManager.getSpinningSalesContractReport(info)
        .then(result => {
            resultForExcelTest = result;
            var spinningSalesContract = result.data;
            spinningSalesContract.should.instanceof(Array);
            spinningSalesContract.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});


it('#04. should success when get data for Excel Report', function (done) {
    var query = {};

    spinningSalesContractManager.getXls(resultForExcelTest, query)
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
    spinningSalesContractManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});