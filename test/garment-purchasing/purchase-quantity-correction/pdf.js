require("should");
var PurchaseQuantityCorrectionDataUtil = require('../../data-util/garment-purchasing/purchase-quantity-correction-data-util');
var helper = require("../../helper");
var validate = require("dl-models").validator.garmentPurchasing.garmentPurchaseCorrection;
var moment = require('moment');

var PurchaseQuantityCorrectionManager = require("../../../src/managers/garment-purchasing/purchase-quantity-correction-manager");
var purchaseQuantityCorrectionManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            purchaseQuantityCorrectionManager = new PurchaseQuantityCorrectionManager(db, {
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
    PurchaseQuantityCorrectionDataUtil.getNewData()
        .then((data) => purchaseQuantityCorrectionManager.create(data))
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
    purchaseQuantityCorrectionManager.getSingleById(createdId)
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

// it("#03. should error when create new data with date Input greater than today", function (done) {
//     PurchaseQuantityCorrectionDataUtil.getNewData()
//         .then((data) => {
//             var dateTomorrow = new Date().setDate(new Date().getDate() + 2);
//             data.date = moment(dateTomorrow).format('YYYY-MM-DD');
//             purchaseQuantityCorrectionManager.create(data)
//                 .then((purchaseQuantityCorrection) => {
//                     done("should error when create new data with date is greater than today");
//                 })
//                 .catch((e) => {
//                     try {
//                         e.errors.should.have.property('date');
//                         done();
//                     }
//                     catch (ex) {
//                         done(ex);
//                     }
//                 });
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

it('#03. should success when create pdf', function (done) {
    var query = {};

    purchaseQuantityCorrectionManager.getPdf(createdData, 7)
        .then((pdfData) => {
            done();
        }).catch((e) => {
            done(e);
        });
});

it("#05. should success when destroy all unit test data", function (done) {
    purchaseQuantityCorrectionManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});