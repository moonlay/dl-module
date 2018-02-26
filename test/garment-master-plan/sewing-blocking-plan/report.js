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
it("#02. should success when get report with parameter unit and year", function (done) {
    manager.getReport({"unit" : unit,"year" : year})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
var dummyData;
var dummyDataId;
var queryMonitoringRemainingEH = {};
var dummyMonitoringRemainingEHResult = {};

it(`#03. should success when get created new data`, function (done) {
    dataUtil.getNewData()
        .then((data) => {
            manager.create(data)
                .then((id) => {
                    dummyDataId = id;
                    dummyData = data;
                    queryMonitoringRemainingEH.year = 2018;
                    queryMonitoringRemainingEH.unit = "C1A";
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
it("#04. should success when get report with parameter year and getExcel", function (done) {
   
    manager.getReport({"year" : year})
            .then((data) => {
                data.should.instanceof(Array);
                var result = {
                    data : data
                };
                manager.getXls(result, {"year" : year})
                    .then(xls => {
                        xls.should.instanceof(Object);
                        xls.should.have.property('data');
                        xls.should.have.property('options');
                        xls.should.have.property('name');
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

 
