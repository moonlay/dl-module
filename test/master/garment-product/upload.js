'use strict';
var should = require('should');
var helper = require("../../helper");
var ProductManager = require("../../../src/managers/master/garment-product-manager");
var productManager = null;
var dataUtil = require("../../data-util/master/garment-product-data-util");
var validate = require("dl-models").validator.master.product;
var ObjectId = require("mongodb").ObjectId;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            productManager = new ProductManager(db, {
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
    data.push("Kode Barang");
    data.push("Nama Barang");
    data.push("Satuan");
    data.push("Mata Uang");
    data.push("Harga");
    data.push("Tags");
    data.push("Keterangan");
    data.push("Const");
    data.push("Yarn");
    data.push("Width");
    dataAll.push(data);
    data = [];

    data.push("A01 B0001");
    data.push("BALL BEARING 6000");
    data.push("PCS");
    data.push("IDR");
    data.push("3757.5");
    data.push("");
    data.push("");
    data.push("78X48");
    data.push("75DX100D");
    data.push("48");
    dataAll.push(data);
    data = [];

    data.push("A01 B0014");
    data.push("BALL BEARING 6013");
    data.push("PCS");
    data.push("IDR");
    data.push("32445");
    data.push("");
    data.push("");
    data.push("78X48");
    data.push("75DX100D");
    data.push("48");
    dataAll.push(data);
    data = [];

    productManager.insert(dataAll)
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
    data.push("Kode Barang");
    data.push("Nama Barang");
    data.push("Satuan");
    data.push("Mata Uang");
    data.push("Harga");
    data.push("Tags");
    data.push("Keterangan");
    data.push("Const");
    data.push("Yarn");
    data.push("Width");
    dataAll.push(data);
    data = [];

    data.push("A01 B0001");
    data.push("BALL BEARING 6000");
    data.push("PCS");
    data.push("IDR");
    data.push("3757.5");
    data.push("");
    data.push("");
    data.push("78X48");
    data.push("75DX100D");
    data.push("48");
    dataAll.push(data);
    dataAll.push(data);
    data = [];

    productManager.insert(dataAll)
        .then((id) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#02. should error when insert data upload using unregister uom and currency`, function (done) {
    var dataAll = [];
    var data = [];
    data.push("Kode Barang");
    data.push("Nama Barang");
    data.push("Satuan");
    data.push("Mata Uang");
    data.push("Harga");
    data.push("Tags");
    data.push("Keterangan");
    data.push("Const");
    data.push("Yarn");
    data.push("Width");
    dataAll.push(data);
    data = [];

    data.push("A101 B0001");
    data.push("B BEARING 6000");
    data.push("PCS2");
    data.push("IDR2");
    data.push("3757.5");
    data.push("");
    data.push("");
    data.push("78X48");
    data.push("75DX100D");
    data.push("48");
    dataAll.push(data);
    dataAll.push(data);
    data = [];

    productManager.insert(dataAll)
        .then((id) => {
            data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});