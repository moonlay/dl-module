require("should");
var UnitReceiptNote = require("../../data-util/garment-purchasing/unit-receipt-note-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.unitReceiptNote;
var moment = require('moment');

var UnitReceiptNoteManager = require("../../../src/managers/garment-purchasing/unit-receipt-note-manager");
var unitReceiptNoteManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            unitReceiptNoteManager = new UnitReceiptNoteManager(db, {
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
    UnitReceiptNote.getNewData()
        .then((data) => unitReceiptNoteManager.create(data))
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

    unitReceiptNoteManager.pdf(createdId, 7)
        .then(pdfData => {
            done();
        }).catch(e => {
            done(e);
        });
});

it("#03. should success when destroy all unit test data", function (done) {
    unitReceiptNoteManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});