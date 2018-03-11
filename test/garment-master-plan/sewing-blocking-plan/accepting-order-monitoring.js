'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/sewing-blocking-plan-manager");
var manager = null;
var dataUtil =require("../../data-util/garment-master-plan/sewing-blocking-plan-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.sewingBlockingPlan;
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
        });
});

var dummyData;
var dummyDataId;
var queryAcceptingOrderMonitoring = {};
var dummyAcceptingOrderMonitoringResult = {};

it(`#01. should success when get created new data`, function (done) {
    dataUtil.getNewData()
        .then((data) => {
            manager.create(data)
                .then((id) => {
                    dummyDataId = id;
                    dummyData = data;
                    queryAcceptingOrderMonitoring.year = dummyData.details[0].weeklyPlanYear;
                    queryAcceptingOrderMonitoring.unit = '';
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

it("#02. should success when get Accepting Order Monitoring", function (done) {
    manager.getAcceptedOrderMonitoring(queryAcceptingOrderMonitoring)
        .then((data) => {
            data.should.instanceof(Array);
            dummyAcceptingOrderMonitoringResult.data = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success when get Accepting Order Monitoring XLS", function (done) {
    manager.getAcceptedOrderMonitoringXls(dummyAcceptingOrderMonitoringResult, queryAcceptingOrderMonitoring)
        .then((xls) => {
            xls.should.instanceof(Object);
            xls.should.have.property('data');
            xls.should.have.property('options');
            xls.should.have.property('name');
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#04. should success when destroy data with id', function(done) {
    manager.destroy(dummyDataId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#05. should null when get destroyed data', function(done) {
    manager.getSingleByIdOrDefault(dummyDataId)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#06. should success when remove all data`, function(done) {
    manager.collection.remove({})
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

