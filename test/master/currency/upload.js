'use strict';
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/master/currency-manager");
var manager = null;
var dataUtil = require("../../data-util/master/currency-data-util");
var validate = require("dl-models").validator.master.category;
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
    data.push("Simbol");
    data.push("Rate");
    data.push("Keterangan");
    dataAll.push(data);
    data = [];

    data.push("IDR");
    data.push("Rp");
    data.push("1");
    data.push("RUPIAH");
    dataAll.push(data);
    data = [];

    data.push("USD");
    data.push("$");
    data.push("13092");
    data.push("US DOLLAR");
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
    data.push("Simbol");
    data.push("Rate");
    data.push("Keterangan");
    dataAll.push(data);
    data = [];

    data.push("IDR");
    data.push("Rp");
    data.push("1");
    data.push("RUPIAH");
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