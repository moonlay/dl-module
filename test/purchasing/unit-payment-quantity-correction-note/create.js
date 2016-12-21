require("should");
var helper = require("../../helper");

var unitPaymentQuantityCorrectionNote = require('../../data').transaction.unitPaymentQuantityCorrectionNote;
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
    unitPaymentQuantityCorrectionNote.getNew()
        .then((data) => {
            data._id.should.be.Object();
            createdId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        });
});