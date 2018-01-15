var helper = require("../../helper");
var DataUtil = require("../../data-util/master/fp-duration-estimation-data-util");
var Manager = require("../../../src/managers/master/fp-duration-estimation-manager");
var instanceManager = null;
var validate = require("dl-models").validator.master.finishingPrintingDurationEstimation;

var should = require("should");

before("#00. connect db", function (done) {
    helper.getDb()
        .then((db) => {
            instanceManager = new Manager(db, {
                username: "unit-test"
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});
var createdData;
it("#01. should success when create new data", function (done) {
    DataUtil.getNewData()
        .then(data => {
            data.tempo = 0;
            instanceManager.create(data)
                .then(id => {
                    id.should.be.Object();
                    instanceManager.getSingleById(id)
                        .then((res) => {
                            createdData = res;
                            done();
                        })
                        .catch((e) => {
                            done(e);
                        });
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});
it("#02. should error when create new data with process type", function (done) {
    delete createdData._id;
    instanceManager.create(createdData)
        .then(id => {
            done("Should not be able to create new data with duplicate area");
        })
        .catch((e) => {
            e.errors.should.have.property("processTypeId");
            done();
        });
});

it("#03. should error when create new data with duplicate area", function (done) {
    DataUtil.getNewData()
        .then(data => {
            data.areas.push(data.areas[0]);
            instanceManager.create(data)
                .then(id => {
                    done("Should not be able to create new data with duplicate area");
                })
                .catch((e) => {
                    e.errors.should.have.property("areas");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});