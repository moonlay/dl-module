'use strict';
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/master/garment-buyer-manager");
var manager = null;
var dataUtil = require("../../data-util/master/garment-buyer-data-util");
var validate = require("dl-models").validator.master.buyer;
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
    data.push("Kode Buyer");
    data.push("Nama");
    data.push("Alamat");
    data.push("Kota");
    data.push("Negara");
    data.push("NPWP");
    data.push("Jenis Buyer");
    data.push("Kontak");
    data.push("Tempo");
    dataAll.push(data);
    data = [];

    data.push("A0001");
    data.push("GAWE REJO");
    data.push("SURABAYA");
    data.push("SURABAYA");
    data.push("INDONESIA");
    data.push("");
    data.push("Lokal");
    data.push("");
    data.push("");
    dataAll.push(data);
    data = [];

    data.push("AK0021L");
    data.push("A. KARAGIANNIS & CO.,OE,2");
    data.push("KIRIKIOU STREET");
    data.push("GREECE");
    data.push("GREECE");
    data.push("");
    data.push("Ekspor");
    data.push("");
    data.push("");
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
    data.push("Kode Buyer");
    data.push("Nama");
    data.push("Alamat");
    data.push("Kota");
    data.push("Negara");
    data.push("NPWP");
    data.push("Jenis Buyer");
    data.push("Kontak");
    data.push("Tempo");
    dataAll.push(data);
    data = [];

    data.push("A0001");
    data.push("GAWE REJO");
    data.push("SURABAYA");
    data.push("SURABAYA");
    data.push("INDONESIA");
    data.push("");
    data.push("Lokal");
    data.push("");
    data.push("");
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