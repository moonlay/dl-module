'use strict';

var should = require('should');
var helper = require("../helper"); 
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var dataUtil = require('../data').transaction.purchaseRequest;
var PurchaseRequestManager = require("../../src/managers/purchasing/purchase-request-manager");
var purchaseRequestManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseRequestManager = new PurchaseRequestManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var purchaseRequestId;
it('#01. should success when create new data purchase request', function (done) {
    dataUtil.getNew()
        .then(data => {
            data._id.should.be.Object();
            purchaseRequestId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var purchaseRequest;
it(`#02. should success when get created data purchase request with id`, function (done) {
    purchaseRequestManager.getSingleByQuery({ _id: purchaseRequestId })
        .then(data => {
            validatorPurchasing.purchaseRequest(data);
            data.should.instanceof(Object);
            purchaseRequest = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#03. should success when update created data purchase request`, function (done) {
    purchaseRequest.remark += '[updated]';
    purchaseRequestManager.update(purchaseRequest)
        .then(id => {
            purchaseRequestId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#04. should success when get updated data purchase request with id`, function (done) {
    purchaseRequestManager.getSingleByQuery({ _id: purchaseRequestId })
        .then(data => {
            data.no.should.equal(purchaseRequest.no);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#05. should success when delete data purchase request`, function (done) {
    purchaseRequestManager.delete(purchaseRequest)
        .then(id => {
            purchaseRequestId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#06. should _deleted=true`, function (done) {
    purchaseRequestManager.getSingleByQuery({ _id: purchaseRequestId })
        .then(data => {
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});