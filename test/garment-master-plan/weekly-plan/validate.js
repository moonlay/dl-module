'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/weekly-plan-manager");
var manager = null;
var dataUtil = require("../../data-util/garment-master-plan/weekly-plan-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.weeklyPlan;
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

it("#02. should error when create new data with month out of range", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.items[0].month = 2;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with month out of range");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('items');
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should error when create new data with invalid month", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.items[0].month = 12;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with invalid month");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('items');
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should error when create new data with invalid efficiency and operator", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.items[0].efficiency = 0;
            data.items[0].operator = 0;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with invalid month");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('items');
                    for(var item of e.errors.items){
                        if (Object.getOwnPropertyNames(item).length > 0) {
                            item.should.have.property('efficiency');
                            item.should.have.property('operator');
                        }
                    }
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should error when create new data with no data unit", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.unitId = "unitId";
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no data unit");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('unit');
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});
