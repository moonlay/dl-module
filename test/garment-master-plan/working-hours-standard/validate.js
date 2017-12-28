'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/working-hours-standard-manager");
var manager = null;
var dataUtil =require("../../data-util/garment-master-plan/working-hours-standard-util");
var validate = require("dl-models").validator.garmentMasterPlan.workingHoursStandard;



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

it("#02. should error when create new data with end < start ", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.start=10;
            data.end=5;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with end < start");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("end");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});