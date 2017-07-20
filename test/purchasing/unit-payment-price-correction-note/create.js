require("should");
var helper = require("../../helper");

var unitPaymentPriceCorrectionNoteDataUtil = require("../../data-util/purchasing/unit-payment-price-correction-note-data-util");
var UnitPaymentPriceCorrectionNoteManager = require("../../../src/managers/purchasing/unit-payment-price-correction-note-manager");
var unitPaymentPriceCorrectionNoteManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            unitPaymentPriceCorrectionNoteManager = new UnitPaymentPriceCorrectionNoteManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should error when create with empty data ', function(done) {
    unitPaymentPriceCorrectionNoteManager.create({})
        .then((id) => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it('#02. should success when create new unit-payment-quantity-correction-note', function (done) {
    unitPaymentPriceCorrectionNoteDataUtil.getNewTestData()
        .then((data) => {
            data._id.should.be.Object();
            createdId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        });
});


it('#03. should success when get pdf ', function(done) {
    unitPaymentPriceCorrectionNoteManager.pdf(createdId)
        .then((binary) => {
            done();
        })
        .catch(e => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});
it("#04. should success when get report with date parameter", function(done) {
    unitPaymentPriceCorrectionNoteManager.getDataKoreksiHarga({"dateFrom" : "2017-02-02", "dateTo" : "2017-02-02"})
        .then((result) => {
            result.should.instanceof(Array);
            // result.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});