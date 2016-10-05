var helper = require("../helper");
var UomManager = require("../../src/managers/master/uom-manager");
var instanceManager = null;
var validator = require('dl-models').validator.master;

require("should");

function getData() {
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
            instanceManager = new UomManager(db, {
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
            validator.uom(data);
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#04. should success when update created data`, function (done) {

    createdData.unit += '[updated]';
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
            data.unit.should.equal(createdData.unit);
            done();
        })
        .catch(e => {
            done(e);
        })
});


it(`#06. should success when delete data`, function(done) { 
    instanceManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});


it(`#07. should _deleted=true`, function(done) {
    instanceManager.getSingleByQuery({_id:createdId})
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

it('#08. should error when create new data with same unit', function(done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done("Should not be able to create data with same unit");
        })
        .catch(e => {
            e.errors.should.have.property('unit');
            done();
        })
});

it('#09. should error with property unit ', function(done) { 
   instanceManager.create({})
       .then(id => { 
           done("Should not be error with unit");
       })
       .catch(e => { 
          try
          {
              e.errors.should.have.property('unit');
              done();
          }catch(ex)
          {
              done(ex);
          } 
       })
});