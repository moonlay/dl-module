'use strict';
var should = require('should');
var helper = require("../../helper");
var HolidayManager = require("../../../src/managers/master/holiday-manager");
var holidayManager = null;
var dataUtil = require("../../data-util/master/holiday-data-util");
var validate = require("dl-models").validator.master.holiday;
var ObjectId = require("mongodb").ObjectId;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            holidayManager = new HolidayManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});


var createdIds = [];
it(`#01. should success when get created new data 1`, function (done) {
    dataUtil.getNewData()
        .then((data) => holidayManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdIds.push(id);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it(`#02. should success when get created new data 2`, function (done) {
    dataUtil.getNewData()
        .then((data) => holidayManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdIds.push(id);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#02. should success when get holiday by id`, function (done) {
    var query = {};
    var jobs = [];

    for (var createdId of createdIds) {
        jobs.push({ "_id": new ObjectId(createdId) });
    }

    var filter = {};

    if (jobs.length === 1) {
        filter = jobs[0];
        query.filter = filter;
    } else if (jobs.length > 1) {
        filter = { '$or': jobs };
        query.filter = filter;
    }
    holidayManager.readById(query).then(
        holidays => {
            holidays.should.instanceof(Object);
            holidays.data.should.instanceof(Array);
            holidays.data.length.should.equal(2);
            done();
        }).catch(e => {
            done(e);
        });
});