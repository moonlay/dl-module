'use strict';
var should = require('should');
var helper = require("../../helper");
var CategoryManager = require("../../../src/managers/master/garment-category-manager");
var categoryManager = null;
var dataUtil = require("../../data-util/master/garment-category-data-util");
var validate = require("dl-models").validator.master.category;
var ObjectId = require("mongodb").ObjectId;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            categoryManager = new CategoryManager(db, {
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
    data.push("Kode Kebutuhan");
    data.push("UOM");
    dataAll.push(data);
    data = [];

    data.push("AK");
    data.push("KEBERSIHAN");
    data.push("");
    data.push("COLT");
    dataAll.push(data);
    data = [];

    data.push("AL");
    data.push("ALAT LISTRIK");
    data.push("");
    data.push("COLT");
    dataAll.push(data);
    data = [];

    categoryManager.insert(dataAll)
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
    data.push("Kode Kebutuhan");
    data.push("UOM");
    dataAll.push(data);
    data = [];

    data.push("AK");
    data.push("KEBERSIHAN");
    data.push("");
    data.push("COLT");
    dataAll.push(data);
    dataAll.push(data);
    data = [];

    categoryManager.insert(dataAll)
        .then((id) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});