'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/weekly-plan-manager");
var manager = null;
var dataUtil = require("../../data-util/garment-master-plan/weekly-plan-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.weeklyPlan;
var moment = require('moment');


var UnitManager = require("../../../src/managers/master/unit-manager");
var unitManager = null;
var UnitdataUtil = require("../../data-util/master/unit-data-util");
var validateUnit = require("dl-models").validator.master.unit;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'unit-test'
            });

            unitManager = new UnitManager(db, {
                username: 'unit-test'
            });

            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdDataUnit;
var createdIdUnit;
it(`#01. should success when get created new data unit`, function (done) {
    UnitdataUtil.getNewData()
    .then((data) => createdDataUnit=data)
            .then((data) => unitManager.create(data))
            .then((id) => {
                id.should.be.Object();
                createdIdUnit = id;
                done();
            })
            .catch((e) => {
                done(e);
            });
});

var createdData;
var createdId;
it(`#02. should success when create new data`, function (done) {
    dataUtil.getNewData()
    .then((data) => {
            data.unitId = createdIdUnit;
            data.unit=createdDataUnit;
            createdData=data;
            manager.create(data)
            .then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
            })
            .catch((e) => {
                done(e);
            });
});
});

it(`#03. should success when get week by filter from created data`, function (done) {
    var key=createdData.name;
    var filter={};
    filter.year=createdData.year;
    filter.unit=createdData.unit.code;
    manager.getWeek(key,filter).then(
        week => {
            week.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
    });
});

it(`#03-1. should success when get week by filter from created data`, function (done) {
    var key=createdData.name;
    var filter={};
    filter.year=createdData.year;
    filter.unit=createdData.unit.code;
    filter.weekNumber=createdData.items[1].weekNumber;
    manager.getWeek(key,filter).then(
        week => {
            week.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
    });
});

it("#03-2. should success when get year with keyword", function (done) {
    manager.getYear(createdData.year)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03-3. should success when get unit with keyword and filter", function (done) {
    manager.getUnit(createdData.unit.code, {'year' : createdData.year})
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#04. should success when destroy data with id`, function(done) {
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

it(`#05. should null when get destroyed data`, function(done) {
    manager.getSingleByIdOrDefault(createdId)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#06. should success when destroy unit data with id`, function(done) {
    unitManager.destroy(createdIdUnit)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#07. should null when get destroyed unit data`, function(done) {
    unitManager.getSingleByIdOrDefault(createdIdUnit)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#08. should success when remove all data`, function(done) {
    manager.collection.remove({})
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});