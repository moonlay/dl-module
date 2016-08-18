'use strict';

var should = require('should');
var helper = require("../helper");
var POTextileJobOrderManager = require("../../src/managers/po/po-textile-joborder-manager");
var instanceManager = null;

function getData() {
    var POTextileJobOrder = require('dl-models').po.POTextileJobOrder;
    var Supplier = require('dl-models').core.Supplier;
    var Buyer = require('dl-models').core.Buyer;
    var UoM_Template = require('dl-models').core.UoM_Template;
    var UoM = require('dl-models').core.UoM;
    var TextileValue = require('dl-models').po.TextileValue;
    var Textile = require('dl-models').core.Textile;

    var pOTextileJobOrder = new POTextileJobOrder();
    pOTextileJobOrder.RONo = '12333';
    pOTextileJobOrder.PRNo = '12333';
    pOTextileJobOrder.PONo = '126666';
    pOTextileJobOrder.ppn = 10;
    pOTextileJobOrder.deliveryDate = new Date();
    pOTextileJobOrder.termOfPayment = 'Tempo 2 bulan';
    pOTextileJobOrder.deliveryFeeByBuyer = true;
    pOTextileJobOrder.PODLNo = '';
    pOTextileJobOrder.description = 'SP1';
    pOTextileJobOrder.supplierID = {};
    pOTextileJobOrder.buyerID = {};

    var buyer = new Buyer({
        code: '123',
        name: 'hot',
        description: 'hotline',
        contact: '0812....',
        address: 'test',
        tempo:'tempo',
        local: true
    });
    
    var supplier = new Supplier({
        code: '123',
        name: 'hot',
        description: 'hotline',
        contact: '0812....',
        address: 'test',
        import: true
    });

    var template = new UoM_Template({
        mainUnit: 'M',
        mainValue: 1,
        convertedUnit: 'M',
        convertedValue: 1
    });

    var _units = [];
    _units.push(template);

    var _uom = new UoM({
        category: 'UoM-Unit-Test',
        default: template,
        units: _units
    });

    var textile = new Textile({
        code: '22',
        name: 'hotline',
        description: 'hotline123',
        price:0,
        UoM: _uom
    });

    var textileValue = new TextileValue({
        qty: 0,
        unit: '',
        price: 0,
        textile: textile
    });
    var _textiles = [];
    _textiles.push(textileValue);

    pOTextileJobOrder.supplier = supplier;
    pOTextileJobOrder.buyer=buyer;
    pOTextileJobOrder.items = _textiles;
    return pOTextileJobOrder;
}


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new POTextileJobOrderManager(db, {
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
            // validate.product(data);
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#03. should success when update created data`, function (done) {
    createdData.RONo += '[updated]';
    createdData.PRNo += '[updated]';
    createdData.PONo += '[updated]';
    createdData.supplierId += '[updated]';
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

it(`#04. should success when get updated data with id`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            data.RONo.should.equal(createdData.RONo);
            data.PRNo.should.equal(createdData.PRNo);
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


it(`#05. should success when delete data`, function (done) {
    instanceManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#06. should _deleted=true`, function (done) {
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

it('#07. should error when create new data with same code', function (done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done("Should not be able to create data with same code");
        })
        .catch(e => {
            e.errors.should.have.property('code');
            done();
        })
});

it('#08. should error with property code and name ', function (done) {
    instanceManager.create({})
        .then(id => {
            done("Should not be error with property code and name");
        })
        .catch(e => {
            try {
                e.errors.should.have.property('code');
                e.errors.should.have.property('name');
                done();
            } catch (ex) {
                done(ex);
            }
        })
});
