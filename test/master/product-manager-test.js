var helper = require("../helper");
var ProductManager = require("../../src/managers/master/product-manager");
var UomManager = require("../../src/managers/master/uom-manager");
var instanceManager = null;
var uomManager = null;
var validator = require('dl-models').validator.master;
var should = require('should');

function getData() {
    var Product = require('dl-models').master.Product;
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    var product = new Product();
    product.code = code;
    product.name = `name[${code}]`;
    product.price = 50;
    product.description = `description for ${code}`;
    product.tags = `tags for ${code}`;
    product.properties = [];

    return product;
}

function getDataUom() {
    var Uom = require('dl-models').master.Uom;
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    var uom = new Uom();
    uom.unit= `Satuan [${code}]`;
    return uom;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new ProductManager(db, {
                username: 'unit-test'
            });
            
            uomManager = new UomManager(db, {
                username: 'unit-test'
            });
            
            done();
        })
        .catch(e => {
            done(e);
        })
});

var uomId;
it('#01. should success when create new data uom', function (done) {
    var data = getDataUom();
    uomManager.create(data)
        .then(id => {
            id.should.be.Object();
            uomId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var uom;
it(`#02. should success when get created data uom with id`, function (done) {
    uomManager.getSingleByQuery({ _id: uomId })
        .then(data => {
            validator.uom(data);
            data.should.instanceof(Object);
            uom = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#03. should success when read data product', function (done) {
    instanceManager.read()
        .then(documents => {
            //process documents
            documents.data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;
it('#04. should success when create new data product', function (done) {
    var data = getData();
    data.uom=uom;
    data.uomId=uom._id;
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
it(`#05. should success when get created data product with id`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validator.product(data);
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#06. should success when update created data product`, function (done) {

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

it(`#07. should success when get updated data product with id`, function (done) {
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

it(`#08. should success when delete data product`, function (done) {
    instanceManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#09. should _deleted=true`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validator.product(data);
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#10. should error when create new data with same code', function (done) {
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

it('#11. should error with property code and name ', function (done) {
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


