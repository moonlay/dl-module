'use strict';

var should = require('should');
var helper = require("../helper");
var POGarmentGeneralManager = require("../../src/managers/po/po-garment-general-manager");
var instanceManager = null;

function getData() {
    var POGarmentGeneral = require('dl-models').po.POGarmentGeneral;
    var Supplier = require('dl-models').core.Supplier;
    var UoM_Template = require('dl-models').core.UoM_Template;
    var UoM = require('dl-models').core.UoM;
    var PurchaseOrderItem = require('dl-models').po.PurchaseOrderItem;
    var Product = require('dl-models').core.Product;

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    var poGarmentGeneral = new POGarmentGeneral();
    poGarmentGeneral.RONo = '1' + code + stamp;
    poGarmentGeneral.RefPONo = '2' + code + stamp;
    poGarmentGeneral.PONo = '3' + code + stamp;
    poGarmentGeneral.ppn = 10;
    poGarmentGeneral.deliveryDate = new Date();
    poGarmentGeneral.termOfPayment = 'Tempo 2 bulan';
    poGarmentGeneral.deliveryFeeByBuyer = true;
    poGarmentGeneral.PODLNo = '';
    poGarmentGeneral.description = 'SP1';
    poGarmentGeneral.supplierID = {};

    var supplier = new Supplier({
        code: '123',
        name: 'hot',
        description: 'hotline',
        phone: '0812....',
        address: 'test',
        local: true
    });

    var template = new UoM_Template ({
        mainUnit: 'M',
        mainValue: 1,
        convertedUnit: 'M',
        convertedValue: 1
    });

    var _units = [];
    _units.push(template);

    var _uom = new UoM ({
        category: 'UoM-Unit-Test',
        default: template,
        units: _units
    });

    var product = new Product ({
        code: '22',
        name: 'hotline',
        price: 0,
        description: 'hotline123',
        UoM: _uom,
        detail: {}
    });

    var productValue = new PurchaseOrderItem ({
        qty: 0,
        price: 0,
        product: product
    });
    
    var _products = [];
    _products.push(productValue);

    poGarmentGeneral.supplier = supplier;
    poGarmentGeneral.items = _products;
    return poGarmentGeneral;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new POGarmentGeneralManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#01. should success when read data', function (done) {
    instanceManager.read()
        .then(documents => {
            //process documents
            documents.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});


var createdId;
it('#02. should success when create new data', function (done) {
    var data = getData();
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdData;
it(`#03. should success when get created data with id`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#04. should success when update created data`, function (done) {
    createdData.RONo += '[updated]';
    createdData.ReffPONo += '[updated]';
    createdData.PONo += '[updated]';
    createdData.termOfPayment += '[updated]';
    createdData.PODLNo += '[updated]';
    createdData.description += '[updated]';

    instanceManager.update(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#05. should success when get updated data with id`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            data.RONo.should.equal(createdData.RONo);
            data.RefPONo.should.equal(createdData.RefPONo);
            data.PONo.should.equal(createdData.PONo);
            data.termOfPayment.should.equal(createdData.termOfPayment);
            data.PODLNo.should.equal(createdData.PODLNo);
            data.description.should.equal(createdData.description);

            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#06. should success when delete data`, function (done) {
    instanceManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#07. should _deleted=true`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            // validate.product(data);
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});