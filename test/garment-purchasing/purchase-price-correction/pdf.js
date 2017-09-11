require("should");
var PurchasePriceCorrection = require('../../data-util/garment-purchasing/purchase-price-correction-data-util');
var helper = require("../../helper");
var validate = require("dl-models").validator.garmentPurchasing.garmentPurchaseCorrection;
var moment = require('moment');

var PurchaseCorrectionManager = require("../../../src/managers/garment-purchasing/purchase-price-correction-manager");
var purchaseCorrectionManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            purchaseCorrectionManager = new PurchaseCorrectionManager(db, {
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
    PurchasePriceCorrection.getNewData()
        .then((data) => purchaseCorrectionManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#02. should success when create pdf', function (done) {
    var query = {};

    purchaseCorrectionManager.pdf(createdId, 7)
        .then(pdfData => {
            done();
        }).catch(e => {
            done(e);
        });
});

it('#03. should error when create with greater than todays date', function (done) {
    var date = new Date();
    var tomorrowDate = new Date(date.setDate(date.getDate() + 1));

    purchaseCorrectionManager.create({ date: tomorrowDate })
        .then(result => {
            done("Error");
        }).catch(e => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property("date");
            done();
        });
});

it("#04. should success when destroy all unit test data", function (done) {
    purchaseCorrectionManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});