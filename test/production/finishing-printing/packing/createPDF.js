require("should");
var Packing = require('../../../data-util/production/finishing-printing/packing-data-util');
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.qualityControl.packing;
var moment = require('moment');

var PackingManager = require("../../../../src/managers/production/finishing-printing/packing-manager");
var packingManager = null;



before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
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

it("#03. should error when create items with empty data", function (done) {
    Packing.getNewDataItems()
        .then((data) => packingManager.create(data))
        .then((id) => {
            done("Should not be able to create with empty data");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});

// var resultForExcelTest = {};
// it('#03. should success when create report', function (done) {
//     var info = {};
//     info.kanbanCode = createdData.kanbanCode;
//     info.productionOrderNo = createdData.productionOrderNo;
//     info.productionOrderType = createdData.productionOrderType;
//     info.shiftIm = createdData.shiftIm;
//     info.dateFrom = moment(createdData.dateIm).format("YYYY-MM-DD");
//     info.dateTo = moment(createdData.dateIm).format("YYYY-MM-DD");

//     fabricQualityControlManager.getReport(info)
//         .then(result => {
//             resultForExcelTest = result;
//             var fabricQualityControl = result.data;
//             fabricQualityControl.should.instanceof(Array);
//             fabricQualityControl.length.should.not.equal(0);
//             done();
//         }).catch(e => {
//             done(e);
//         });
// });


it('#04. should success when create pdf', function (done) {
    var query = {};

    packingManager.pdf(createdData)
        .then(pdfData => {
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