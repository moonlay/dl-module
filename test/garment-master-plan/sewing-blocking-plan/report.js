'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/sewing-blocking-plan-manager");
var manager = null;
var dataUtil = require("../../data-util/garment-master-plan/sewing-blocking-plan-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.sewingBlockingPlan;
require("should");

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

var dummyData;
var dummyDataId;
var queryReport = {};
var dummyReportResult = {};

it(`#01. should success when get created new data`, function (done) {
    dataUtil.getNewData()
        .then((data) => {
            manager.create(data)
                .then((id) => {
                    dummyDataId = id;
                    dummyData = data;
                    queryReport.year = dummyData.details[0].weeklyPlanYear;
                    queryReport.unit = dummyData.details[0].unit.code;
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

it("#02. should success when get report with parameter year", function (done) {
    manager.getReport({ "year": queryReport.year })
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success when get report with parameter year and unit", function (done) {
    manager.getReport(queryReport)
        .then((data) => {
            data.should.instanceof(Array);
            dummyReportResult.data = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should success when get report with parameter year and unit", function (done) {
    manager.getXls(dummyReportResult, queryReport)
        .then((data) => {
            data.should.instanceof(Object);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#99. should success when remove all data`, function(done) {
    manager.collection.remove({})
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});