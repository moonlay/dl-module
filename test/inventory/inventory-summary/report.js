require("should");
var InventorySummary = require("../../data-util/inventory/inventory-summary-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.inventory.inventorySummary;

var InventorySummaryManager = require("../../../src/managers/inventory/inventory-summary-manager");
var inventorySummaryManager = null;

//delete unitest data
var DLModels = require('dl-models');
var map = DLModels.map;
var MachineType = DLModels.master.MachineType;


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            inventorySummaryManager = new InventorySummaryManager(db, {
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
    InventorySummary.getNewData()
        .then((data) => inventorySummaryManager.create(data))
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
    inventorySummaryManager.getSingleById(createdId)
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
it("#03. should success when read data", function (done) {
    inventorySummaryManager.read({
        "filter": {
            "_id": createdId
        },
        "keyword": "TEST"
    })
        .then((documents) => {
            resultForExcelTest = documents;
            documents.should.have.property("data");
            documents.data.should.be.instanceof(Array);
            documents.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#04. should success when get data for Excel Report', function (done) {
    inventorySummaryManager.getXls(resultForExcelTest)
        .then(xlsData => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});


it("#05. should success when get summary report", function (done) {
    var info = {
        "storageId": createdData.storageId,
        "productId": createdData.productId,
    }
    inventorySummaryManager.getSummaryReport(info)
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should success when destroy all unit test data", function (done) {
    inventorySummaryManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
