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

it("#01. should success when get report with date parameter", function(done) {
    unitPaymentPriceCorrectionNoteManager.getDataKoreksiHarga({})
        .then((result) => {
            result.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when get report with date parameter", function(done) {
    unitPaymentPriceCorrectionNoteManager.getDataKoreksiHarga({"dateFrom" : "2017-02-02", "dateTo" : "2017-02-02"})
        .then((result) => {
            result.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});