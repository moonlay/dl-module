var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitPaymentOrderManager = require("../../../src/managers/purchasing/unit-payment-order-manager");
var unitPaymentOrderManager = null;
var unitPaymentOrder = require('../../data').transaction.unitPaymentOrder;

require("should");

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            unitPaymentOrderManager = new UnitPaymentOrderManager(db, {
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
    unitPaymentOrder.getNew()
        .then((data) => {
            data._id.should.be.Object();
            createdId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#02. should error when create new blank data', function (done) {
    unitPaymentOrderManager.create({})
        .then((id) => {
            id.should.be.Object();
            done();
        })
        .catch(e => {
            e.errors.should.have.property('no');
            e.errors.should.have.property('unit');
            e.errors.should.have.property('supplier');
            done();
        })
});

