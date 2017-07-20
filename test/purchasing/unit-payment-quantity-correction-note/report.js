require("should");
var helper = require("../../helper");
var unitPaymentQuantityCorrectionNoteDataUtil = require("../../data-util/purchasing/unit-payment-quantity-correction-note-data-util");
var UnitPaymentQuantityCorrectionNoteManager = require("../../../src/managers/purchasing/unit-payment-quantity-correction-note-manager");
var unitPaymentQuantityCorrectionNoteManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            unitPaymentQuantityCorrectionNoteManager = new UnitPaymentQuantityCorrectionNoteManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should success when get report with date parameter", function(done) {
    unitPaymentQuantityCorrectionNoteManager.getMonitoringKoreksi({})
        .then((result) => {
            result.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when get report with date parameter", function(done) {
    var dateFrom=new Date();
    var dateTo=new Date();
    unitPaymentQuantityCorrectionNoteManager.getMonitoringKoreksi(dateFrom,dateTo)
        .then((result) => {
            result.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});