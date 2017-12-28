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

var createdId;
it("#01. should success when create new data", function (done) {
    dataUtil.getNewData()
        .then((data) => manager.create(data))
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
    manager.getSingleById(createdId)
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

it(`#03. should success when confirm created data`, function (done) {
    createdData.type='confirm';
        manager.update(createdData)
            .then((id) => {
                createdId.toString().should.equal(id.toString());
                done();
            })
            .catch((e) => {
                done(e);
            });
    });

it(`#03. should error when confirm created data without data confirm`, function (done) {
    createdData.type='confirm';
        manager.update(createdData)
            .then((id) => {
                createdId.toString().should.equal(id.toString());
                done();
            })
            .catch((e) => {
                done(e);
            });
});

it("#04. should error when confirm created data without data items", function (done) {
    createdData.type='confirm';
    createdData.items = [{
        quantity: 0,
        deliveryDate : ''
    }];
        manager.update(createdData)
            .then((id) => {
                    done("should error when confirm created data without data items");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("items");
                    done();
                });
});
