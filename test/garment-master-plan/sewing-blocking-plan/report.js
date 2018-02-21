'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/sewing-blocking-plan-manager");
var manager = null;
var dataUtil =require("../../data-util/garment-master-plan/sewing-blocking-plan-data-util");
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
 var year=2018;
 var unit="C1A";
 
it("#01. should success when get report with parameter year", function (done) {
    manager.getReport({"year" : year})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it("#01. should success when get report with parameter unit", function (done) {
    manager.getReport({"unit" : unit})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});