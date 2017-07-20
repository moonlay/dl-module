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

it('#01. should error when create with empty data ', function(done) {
    unitPaymentQuantityCorrectionNoteManager.create({})
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
    unitPaymentQuantityCorrectionNoteDataUtil.getNewTestDataInsertTwice()
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
    unitPaymentQuantityCorrectionNoteManager.pdf(createdId)
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
   // var dateFrom=new Date();
   // var dateTo=new Date();
    unitPaymentQuantityCorrectionNoteManager.getMonitoringKoreksi({"dateForm" : "2017-02-01", "dateTo" : "2017-02-01"})
        .then((result) => {
            result.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});