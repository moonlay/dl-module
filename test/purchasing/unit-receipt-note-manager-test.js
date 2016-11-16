var helper = require("../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitReceiptNoteManager = require("../../src/managers/purchasing/unit-receipt-note-manager");
var unitReceiptNoteManager = null;  
var unitReceiptNote = require('../data').transaction.unitReceiptNote;
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

var createdId;
it('#01. should success when create new data', function (done) { 
    unitReceiptNote.getNew()
        .then(data => {
            data._id.should.be.Object();
            createdId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdData;
it(`#02. should success when get created data with id`, function (done) {
    unitReceiptNoteManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validatorPurchasing.unitReceiptNote(data);
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#03. should success when update created data`, function (done) {
    createdData.remark += '[updated]'; 
    unitReceiptNoteManager.update(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#04. should success when get updated data with id`, function (done) {
    unitReceiptNoteManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            data.no.should.equal(createdData.no); 
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#05. should success when delete data`, function (done) {
    unitReceiptNoteManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#06. should error when create new data with same code', function (done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    unitReceiptNoteManager.create(data)
        .then(id => {
            id.should.be.Object(); 
            done();
        })
        .catch(e => {
            e.errors.should.have.property('no');
            done();
        })
});
it('#07. should error when create new blank data', function (done) {
    unitReceiptNoteManager.create({})
        .then(id => {
            id.should.be.Object(); 
            done();
        })
        .catch(e => {
            e.errors.should.have.property('no');
            e.errors.should.have.property('unit');
            e.errors.should.have.property('supplier');
            e.errors.should.have.property('deliveryOrder');
            done();
        })
});