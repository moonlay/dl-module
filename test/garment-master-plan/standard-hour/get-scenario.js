'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/standard-hour-manager");
var manager = null;
var dataUtil = require("../../data-util/garment-master-plan/standard-hour-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.standardHour;
var moment = require('moment');


var StyleManager = require("../../../src/managers/garment-master-plan/style-manager");
var styleManager = null;
var StyledataUtil = require("../../data-util/garment-master-plan/style-data-util");
var validateStyle = require("dl-models").validator.garmentMasterPlan.style;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'unit-test'
            });

            styleManager = new StyleManager(db, {
                username: 'unit-test'
            });

            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdDataStyle;
var createdIdStyle;
it(`#01. should success when get created new data style`, function (done) {
    StyledataUtil.getNewData()
    .then((data) => createdDataStyle=data)
            .then((data) => styleManager.create(data))
            .then((id) => {
                id.should.be.Object();
                createdIdStyle = id;
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
            data.styleId = createdIdStyle;
            data.style=createdDataStyle;
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

it(`#03. should success when get sh by filter from created data`, function (done) {
    var key=createdData.style.code;
    manager.getStandardHourByStyle(key).then(
        sh => {
            sh.should.instanceof(Array);
            done();
        }).catch(e => {
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

it(`#06. should success when destroy style data with id`, function(done) {
    styleManager.destroy(createdIdStyle)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#07. should null when get destroyed style data`, function(done) {
    styleManager.getSingleByIdOrDefault(createdIdStyle)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});