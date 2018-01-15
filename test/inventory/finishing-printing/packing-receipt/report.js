require("should");
var PackingReceipt = require("../../../data-util/inventory/finishing-printing/fp-packing-receipt-data-util");
var helper = require("../../../helper");
var validate = require("dl-models").validator.inventory.finishingPrinting.fpPackingReceipt;

var PackingReceiptManager = require("../../../../src/managers/inventory/finishing-printing/fp-packing-receipt-manager");
var packingReceiptManager = null;

//delete unitest data
// var DLModels = require('dl-models');
// var map = DLModels.map;
// var MachineType = DLModels.master.MachineType;


before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            packingReceiptManager = new PackingReceiptManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdId;
it("#01. should success when create new data", function (done) {
    PackingReceipt.getNewData()
        .then((data) => packingReceiptManager.create(data))
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
    packingReceiptManager.getSingleById(createdId)
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
    packingReceiptManager.read({
        filter: {
            _id: createdId
        }
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

var filter = {};
it('#04. should success when get data for Excel Report', function (done) {
    packingReceiptManager.getXls(resultForExcelTest, filter)
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
    packingReceiptManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
