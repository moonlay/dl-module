'use strict';
var should = require('should');
var helper = require("../../helper");
var SupplierManager = require("../../../src/managers/master/garment-supplier-manager");
var suppliermanager = null;
var dataUtil = require("../../data-util/master/garment-supplier-data-util");
var validate = require("dl-models").validator.master.buyer;
var ObjectId = require("mongodb").ObjectId;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            suppliermanager = new SupplierManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});
//Kode	Nama Supplier	Alamat	Kontak	PIC	Import	NPWP	Serial Number	Pakai PPN

it(`#01. should success when insert data upload`, function (done) {
    var dataAll = [];
    var data = [];
    data.push("Kode");
    data.push("Nama Supplier");
    data.push("Alamat");
    data.push("Kontak");
    data.push("PIC");
    data.push("Import");
    data.push("NPWP");
    data.push("Serial Number");
    data.push("Pakai PPN");
    dataAll.push(data);
    data = [];

    data.push("PRIJA");
    data.push("PRIMA JAYA");
    data.push("SOLO");
    data.push("BPK SLAMET");
    data.push("BPK SLAMET");
    data.push("false");
    data.push("");
    data.push("");
    data.push("false");
    dataAll.push(data);
    data = [];

    suppliermanager.insert(dataAll)
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
    data.push("Nama Supplier");
    data.push("Alamat");
    data.push("Kontak");
    data.push("PIC");
    data.push("Import");
    data.push("NPWP");
    data.push("Serial Number");
    data.push("Pakai PPN");
    dataAll.push(data);
    data = [];

    data.push("PRIJA");
    data.push("PRIMA JAYA");
    data.push("SOLO");
    data.push("BPK SLAMET");
    data.push("BPK SLAMET");
    data.push("false");
    data.push("");
    data.push("");
    data.push("false");
    dataAll.push(data);
    data = [];

    suppliermanager.insert(dataAll)
        .then((id) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});