'use strict';

var should = require('should');
var helper = require("../../helper");
var DeliveryOrderManager = require("../../../src/managers/purchasing/delivery-order-manager");
var deliveryOrderManager = null;
var deliveryOrderDataUtil = require("../../data-util/purchasing/delivery-order-data-util");
var validate = require("dl-models").validator.purchasing.deliveryOrder;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
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
it("#01. should success when create new data", function (done) {
    deliveryOrderDataUtil.getNewData()
        .then((data) => deliveryOrderManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdData;
it(`#02. should success when get created data with id`, function (done) {
    deliveryOrderManager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            validate(data);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#03. should success when delete data`, function (done) {
    deliveryOrderManager.delete(createdData)
        .then((id) => {
            id.toString().should.equal(createdId.toString());
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it(`#04. should _deleted=true`, function (done) {
    deliveryOrderManager.getSingleByQuery({
        _id: createdId
    })
        .then((data) => {
            validate(data);
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should success when create deleted data", function (done) {
    delete createdData._id;
    deliveryOrderManager.create(createdData)
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});