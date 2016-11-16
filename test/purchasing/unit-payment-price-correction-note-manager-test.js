var helper = require("../helper"); 
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitPaymentPriceCorrectionNoteManager = require("../../src/managers/purchasing/unit-payment-price-correction-note-manager");
var unitPaymentPriceCorrectionNoteManager = null;  
var unitPaymentPriceCorrectionNote = require('../data').transaction.unitPaymentPriceCorrectionNote; 
require("should");  

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            unitPaymentPriceCorrectionNoteManager = new UnitPaymentPriceCorrectionNoteManager(db, {
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
    unitPaymentPriceCorrectionNote.getNew()
        .then(data => {
            data._id.should.be.Object();
            createdId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#02. should success when read data', function (done) {
    unitPaymentPriceCorrectionNoteManager.read()
        .then(documents => { 
            documents.data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
}); 
 
var createdData;
it(`#03. should success when get created data with id`, function (done) {
    unitPaymentPriceCorrectionNoteManager.getSingleById(createdId)
        .then(data => {
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#04. should success when update created data`, function (done) {
    createdData.remark += '[updated]'; 
    unitPaymentPriceCorrectionNoteManager.update(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#05. should success when get updated data with id`, function (done) {
    unitPaymentPriceCorrectionNoteManager.getSingleByQuery({ _id:createdId })
        .then(data => {
            data.no.should.equal(createdData.no);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#06. should success when delete data`, function (done) {
    unitPaymentPriceCorrectionNoteManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#07. should error when create new blank data', function (done) {
    unitPaymentPriceCorrectionNoteManager.create({})
        .then(id => {
            id.should.be.Object();
            done();
        })
        .catch(e => {
            e.errors.should.have.property('no');
            e.errors.should.have.property('unitPaymentOrder');
            e.errors.should.have.property('invoiceCorrectionNo');
            e.errors.should.have.property('invoiceCorrectionDate');
            done();
        })
});

