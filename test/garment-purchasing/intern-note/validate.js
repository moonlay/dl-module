'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var InternNoteManager = require("../../../src/managers/garment-purchasing/intern-note-manager");
var internNoteManager = null;
var InvoiceNoteManager = require("../../../src/managers/garment-purchasing/invoice-note-manager");
var invoiceNoteManager = null;
var interNoteDataUtil = require("../../data-util/garment-purchasing/intern-note-data-util");
var invoiceNoteDataUtil = require("../../data-util/garment-purchasing/invoice-note-data-util");
var validate = require("dl-models").validator.garmentPurchasing.interNote;
var moment = require('moment');
var dateNow;
var dateAfter;
var dateBefore;
var interNoteData;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            internNoteManager = new InternNoteManager(db, {
                username: 'unit-test'
            });
            invoiceNoteManager = new InvoiceNoteManager(db, {
                username: 'unit-test'
            });
            dateNow = new Date();
            dateAfter = new Date();
            dateAfter.setDate(dateAfter.getDate() + 5);
            dateBefore = new Date();
            dateBefore.setDate(dateBefore.getDate() - 5);
            interNoteDataUtil.getNewData()
                .then((result) => {
                    interNoteData = result;
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        })
});

it("#01. should error when create new data with empty data", function (done) {
    internNoteManager.create({})
        .then((id) => {
            done("should error when create new data with empty data");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            done();
        });
});

it("#02. should error when create new data with no exist data supplier", function (done) {
    var data = Object.assign({}, interNoteData);
    data.supplierId = {};
    data.supplier = {};
    internNoteManager.create(data)
        .then((id) => {
            done("should error when create new data with no exist data supplier");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('supplierId');
            done();
        });

});

it("#03. should error when create new data with no exist data currency", function (done) {
    var data = Object.assign({}, interNoteData);
    data.currency = {};
    internNoteManager.create(data)
        .then((id) => {
            done("should error when create new data with no exist data currency");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('currency');
            done();
        });
});

it("#04. should error when create new data with no exist data payment method", function (done) {
    var data = Object.assign({}, interNoteData);
    data.paymentMethod = "";
    internNoteManager.create(data)
        .then((id) => {
            done("should error when create new data with no exist data currency");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('paymentMethod');
            done();
        });
});

it("#05. should error when create new data with date more than this day", function (done) {
    var data = Object.assign({}, interNoteData);
    data.date = moment(dateAfter).format('YYYY-MM-DD');
    internNoteManager.create(data)
        .then((id) => {
            done("should error when create new data with customs date more than this day");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('date');
            done();
        });
});

it("#06. should error when create new data with due date less than this day", function (done) {
    var data = Object.assign({}, interNoteData);
    data.dueDate = moment(dateBefore).format('YYYY-MM-DD');
    internNoteManager.create(data)
        .then((id) => {
            done("should error when create new data with validation date more than this day");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('dueDate');
            done();
        });
});

it("#07. should error when create new data with due date less than date", function (done) {
    var data = Object.assign({}, interNoteData);
    var date = new Date();
    data.dueDate = moment(dateBefore).format('YYYY-MM-DD');
    internNoteManager.create(data)
        .then((id) => {
            done("should error when create new data with validation date less than customs date");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('dueDate');
            done();
        });
});

it("#08. should error when create new data with no exist data invoice note", function (done) {
    var data = Object.assign({}, interNoteData);
    var tamp = [];
    for (var varitem of data.items) {
        varitem._id = "id";
        tamp.push(varitem);
    }
    data.items = tamp;
    internNoteManager.create(data)
        .then((id) => {
            done("should error when create new data with bruto less than netto");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('items');
            e.errors.items.should.instanceof(Array);
            done();
        });
});

it("#09. should error when create new data with different useIncomeTax on items", function (done) {
    var data = Object.assign({}, interNoteData);
    invoiceNoteDataUtil.getNewData2()
        .then((invoiceNote) => {
            data.items.push(invoiceNote)
            internNoteManager.create(data)
                .then((id) => {
                    done("should error when create new data with different useIncomeTax on items");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('items');
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});