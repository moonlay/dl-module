'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/standard-hour-manager");
var manager = null;
var dataUtil = require("../../data-util/garment-master-plan/standard-hour-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.standardHour;
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

it("#02. should error when create new data with no data Style", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.styleId = "styleId";
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no data Style");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("style");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should error when create new data with SH Cutting 0, SH Sewing 0, SH Finishing 0", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.shCutting = 0;
            data.shSewing = 0;
            data.shFinishing = 0;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no data Style");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("shCutting");
                    e.errors.should.have.property("shSewing");
                    e.errors.should.have.property("shFinishing");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should error when create new data with date greater than today", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            var dateAfter = new Date();
            dateAfter = new Date(dateAfter.setDate(dateAfter.getDate() + 2));
            data.date = `${dateAfter.getFullYear()}-${(dateAfter.getMonth() + 1)}-${dateAfter.getDate()}`;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with date greater than today");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("date");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

var createdId;
it("#05. should success when create new data", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            manager.create(data)
                .then((id) => {
                    createdId = id;
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should error when create new data with date greater date data last save", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            var dateAfter = new Date();
            dateAfter = new Date(dateAfter.setDate(dateAfter.getDate() - 2));
            data.date = `${dateAfter.getFullYear()}-${(dateAfter.getMonth() + 1)}-${dateAfter.getDate()}`;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no data Style");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("date");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#07. should success when destroy data with id", function (done) {
    manager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#08. should null when get destroyed data`, function (done) {
    manager.getSingleByIdOrDefault(createdId)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});