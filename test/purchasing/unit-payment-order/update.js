var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitPaymentOrderManager = require("../../../src/managers/purchasing/unit-payment-order-manager");
var unitPaymentOrderManager = null;
var unitPaymentOrder = require("../../data-util/purchasing/unit-payment-order-data-util");

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
    unitPaymentOrder.getNewData()
        .then((data) => unitPaymentOrderManager.create(data))
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
it('#01. should success when create new data', function (done) {
    unitPaymentOrderManager.getSingleById(id)
        .then((data) => {
            data.should.be.Object();
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it('#02. should success when update new blank data', function (done) {
    delete createdData.items[0];
    unitPaymentOrderManager.update({createdData})
        .then((id) => {
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