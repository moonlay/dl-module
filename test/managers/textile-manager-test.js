var helper = require("../helper");
var TextileManager = require("../../src/managers/core/textile-manager");
var instanceManager = null;
var should = require('should');

function getData() {
    var Textile = require('dl-models').core.Textile;
    var Textile = require('dl-models').core.Textile;
    var UoM = require('dl-models').core.UoM;
    var UoM_Template = require('dl-models').core.UoM_Template;

    var textile = new Textile();
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

    textile.code = code;
    textile.name = `name[${code}]`;
    textile.description = `description for ${code}`;
    textile.UoM = uom;
    textile.price = 0;

    return textile;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new TextileManager(db, {
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

    createdData.code += '[updated]';
    createdData.name += '[updated]';
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
            data.code.should.equal(createdData.code);
            data.name.should.equal(createdData.name);
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
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});


it('#08. should error when create new data with same code', function (done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done("Should not be able to create data with same code");
        })
        .catch(e => {
            try {
                e.errors.should.have.property('code');
                done();
            } catch (ex) {
                done(ex);
            }
        })
});

it('#09. should error with property code and name ', function (done) {
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
