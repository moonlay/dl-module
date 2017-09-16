'use strict';

var should = require('should');
var helper = require("../../helper");
var HolidayManager = require("../../../src/managers/master/holiday-manager");
var holidayManager = null;
var dataUtil = require("../../data-util/master/holiday-data-util");
var validate = require("dl-models").validator.master.holiday;

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

var createdData;
var createdId;
it(`#01. should success when get created new data`, function (done) {
    dataUtil.getNewData()
    .then((data) => createdData=data)
            .then((data) => holidayManager.create(data))
            .then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
            })
            .catch((e) => {
                done(e);
            });
});

it(`#02. should success when get holiday by division or name from created data`, function (done) {
    var key=createdData.name;
    var filter=createdData.division.name;
    holidayManager.getHolidayByDivision(key,filter).then(
        holidays => {
            holidays.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
    });
});

it(`#03. should success when destroy data with id`, function(done) {
    holidayManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#04. should null when get destroyed data`, function(done) {
    holidayManager.getSingleByIdOrDefault(createdId)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});