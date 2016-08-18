'use strict';

var should = require('should');
var helper = require("../helper");
var FabricManager = require("../../src/managers/core/fabric-manager");
var instanceManager = null;

function getData() {
    var Fabric = require('dl-models').core.Fabric;
    var UoM = require('dl-models').core.UoM;
    var UoM_Template = require('dl-models').core.UoM_Template;

    var fabric = new Fabric();
    var uom_template = new UoM_Template({
        mainValue: 1,
        mainUnit: 'M',
        convertedValue: 1,
        convertedUnit: 'M'
    });
    var _uom_units = [];
    _uom_units.push(uom_template);

    var uom = new UoM({
        category: 'UoM_Unit_Test',
        default: uom_template,
        units: _uom_units
    });

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    fabric.code = code;
    fabric.name = `name[${code}]`;
    fabric.price = 500;
    fabric.description = `desc for ${code}`;
    fabric.detail.composition = `composition for ${code}`;
    fabric.detail.construction = `construction for ${code}`;
    fabric.detail.yarn = `yarn for ${code}`;
    fabric.detail.width = 5;
    fabric.UoM = uom;
    return fabric;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new FabricManager(db, {
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
    createdData.code += '[updated]';
    createdData.name += '[updated]';
    createdData.description += '[updated]';
    createdData.price = 10000;
    createdData.detail.composition += '[updated]';
    createdData.detail.construction += '[updated]';
    createdData.detail.yarn += '[updated]';
    createdData.detail.width = 9999;

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
            data.code.should.equal(createdData.code);
            data.name.should.equal(createdData.name);
            data.price.should.equal(createdData.price);
            data.description.should.equal(createdData.description);
            data.detail.composition.should.equal(createdData.detail.composition);
            data.detail.construction.should.equal(createdData.detail.construction);
            data.detail.yarn.should.equal(createdData.detail.yarn);
            data.detail.width.should.equal(createdData.detail.width);
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
