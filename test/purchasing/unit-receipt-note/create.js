var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitReceiptNoteManager = require("../../../src/managers/purchasing/unit-receipt-note-manager");
var unitReceiptNoteManager = null;
var unitReceiptNote = require('../../data').transaction.unitReceiptNote;
require("should");

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            unitReceiptNoteManager = new UnitReceiptNoteManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdData;
it('#01. should success when create new data', function (done) {
    unitReceiptNote.getNew()
        .then(data => {
            data.should.be.Object();
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#02. should error when create new data with same code', function (done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    unitReceiptNoteManager.create(data)
        .then(id => {
            id.should.be.Object();
            done();
        })
        .catch(e => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        })
});
it('#03. should error when create new blank data', function (done) {
    unitReceiptNoteManager.create({})
        .then(id => {
            id.should.be.Object();
            done();
        })
        .catch(e => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        })
});