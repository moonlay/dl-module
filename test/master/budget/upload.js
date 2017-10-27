'use strict';
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/master/budget-manager");
var manager = null;
var dataUtil = require("../../data-util/master/budget-data-util");
var validate = require("dl-models").validator.master.budget;
var ObjectId = require("mongodb").ObjectId;

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

it(`#01. should success when insert data upload`, function (done) {
    var dataAll = [];
    var data = [];
    data.push("Kode");
    data.push("Nama");
    dataAll.push(data);
    data = [];

    data.push("A");
    data.push("RUTIN/KABAG");
    dataAll.push(data);
    data = [];

    data.push("C");
    data.push("DIREKTUR PROD");
    dataAll.push(data);
    data = [];

    manager.insert(dataAll)
        .then((data) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#02. should error when insert duplicate data upload`, function (done) {
    var dataAll = [];
    var data = [];
    data.push("Kode");
    data.push("Nama");
    dataAll.push(data);
    data = [];

    data.push("A");
    data.push("RUTIN/KABAG");
    dataAll.push(data);
    data = [];

    manager.insert(dataAll)
        .then((id) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});