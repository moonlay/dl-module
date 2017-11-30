'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/booking-order-manager");
var manager = null;
var dataUtil =require("../../data-util/garment-master-plan/booking-order-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.bookingOrder;
var moment = require('moment');

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it("#01. should error when create new data with empty data", function (done) {
    manager.create({})
        .then((id) => {
            done("should error when create new data with empty data");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            done();
        });
});

it("#02. should error when create new data with no details", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details = [];
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no details");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should error when create new data with deliveryDate < bookingDate ", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            var targetDate=new Date();
            data.deliveryDate=new Date(targetDate.setDate(targetDate.getDate() - 10));
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with deliveryDate < bookingDate");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("deliveryDate");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should error when create new data with orderQuantity not equal total quantity in details", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.orderQuantity=2000;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with date greater than today");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("orderQuantity");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

