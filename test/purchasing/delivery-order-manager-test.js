'use strict';

var should = require('should');
var helper = require("../helper"); 
var validatorPurchasing = require('dl-models').validator.purchasing;
var DeliveryOrderManager = require("../../src/managers/purchasing/delivery-order-manager"); 
var deliveryOrderManager = null;  
var deliveryOrder = require('../data').transaction.deliveryOrder;
 
before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            deliveryOrderManager = new DeliveryOrderManager(db, {
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
    deliveryOrder.getNew()
        .then((data) => {
            data._id.should.be.Object();
            createdId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#02. should success when read data', function (done) {
    deliveryOrderManager.read()
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
    deliveryOrderManager.getSingleByQuery({ _id: createdId })
        .then((data) => { 
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

    deliveryOrderManager.update(createdData)
        .then((id) => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#05. should success when get updated data with id`, function (done) {
    deliveryOrderManager.getSingleByQuery({ _id: createdId })
        .then((data) => {
            data.no.should.equal(createdData.no); 
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#06. should success when delete data`, function (done) {
    deliveryOrderManager.delete(createdData)
        .then((id) => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#07. should error when create new data with same code', function (done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    deliveryOrderManager.create(data)
        .then((id) => {
            id.should.be.Object(); 
            done();
        })
        .catch(e => {
            e.errors.should.have.property('no');
            done();
        })
});