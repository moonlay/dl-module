'use strict';

var should = require('should');
var helper = require("../helper"); 
var validatorPurchasing = require('dl-models').validator.purchasing;
var PurchaseOrderExternalManager = require("../../src/managers/purchasing/purchase-order-external-manager"); 
var purchaseOrderExternalManager = null; 
var purchaseOrderExternal = require('../data').transaction.purchaseOrderExternal;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, {
                username: 'unit-test'
            });  
            done();
        })
        .catch(e => {
            done(e);
        })
});

 
var purchaseOrderExternalId;
it('#01. should success when create new data', function (done) { 
    purchaseOrderExternal.getNew()
        .then((data) => {
            data._id.should.be.Object();
            purchaseOrderExternalId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var purchaseOrderExternal;
it(`#02. should success when get created data with id`, function (done) {
    purchaseOrderExternalManager.pdf(purchaseOrderExternalId.toString())
        .then((data) => { 
            data.should.instanceof(Object);
            purchaseOrderExternal = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#03. should success when read data', function (done) {
    purchaseOrderExternalManager.read()
        .then((documents) => {
            documents.data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});

var purchaseOrderExternal;
it(`#04. should success when get created data with id`, function (done) {
    purchaseOrderExternalManager.getSingleByQuery({ _id: purchaseOrderExternalId })
        .then((data) => {
            validatorPurchasing.purchaseOrderExternal(data);
            data.should.instanceof(Object);
            purchaseOrderExternal = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#05. should success when update data`, function (done) {
    purchaseOrderExternal.remark += '[updated]'; 
    purchaseOrderExternalManager.update(purchaseOrderExternal)
        .then((id) => {
            purchaseOrderExternalId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#06. should success when get updated data with id`, function (done) {
    purchaseOrderExternalManager.getSingleByQuery({ _id: purchaseOrderExternalId })
        .then((data) => {
            data.no.should.equal(purchaseOrderExternal.no); 
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#07. should success when post`, function (done) {
    var listPurchaseOrderExternal = [];
    listPurchaseOrderExternal.push(purchaseOrderExternal);
    purchaseOrderExternalManager.post(listPurchaseOrderExternal)
        .then((data) => {
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#08. should isPosted=true`, function (done) {
    purchaseOrderExternalManager.getSingleByQuery({ _id: purchaseOrderExternalId })
        .then((data) => {
            data.isPosted.should.be.Boolean();
            data.isPosted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#09. should success when delete data`, function (done) {
    purchaseOrderExternalManager.delete(purchaseOrderExternal)
        .then((id) => {
            purchaseOrderExternalId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#10. should _deleted=true`, function (done) {
    purchaseOrderExternalManager.getSingleByQuery({ _id: purchaseOrderExternalId })
        .then((data) => {
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});

