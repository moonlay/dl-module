require("should");
var helper = require("../../helper");

var unitPaymentPriceCorrectionNote = require('../../data').transaction.unitPaymentPriceCorrectionNote;
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
    unitPaymentPriceCorrectionNote.getNew()
        .then((data) => {
            data._id.should.be.Object();
            createdId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        });
});