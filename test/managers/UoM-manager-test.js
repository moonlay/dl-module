var helper = require("../helper");
var UoMManager = require("../../src/managers/core/UoM-manager");
var instanceManager = null;

require("should");

function getData() {
    var UoM = require('dl-models').core.UoM;

    var UoM_Template = require('dl-models').core.UoM_Template;
    
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    var uom_template = new UoM_Template({
        mainValue: 1,
        mainUnit: 'M',
        convertedValue: 1,
        convertedUnit: 'M'
    });
    
    var _uom_units = [];
    _uom_units.push(uom_template);

    var uom = new UoM({
        category: code+'UoM_Unit_Test',
        default: uom_template,
        units: _uom_units
    });

    return uom;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new UoMManager(db, {
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

    createdData.category += '[updated]';
    createdData.default.mainUnit += '[updated]';
    createdData.default.mainValue += 2;
    createdData.default.convertedUnit += '[updated]';
    createdData.default.convertedValue += 2;

    for (var item of createdData.units) {
        item['mainUnit'] += '[updated]';
        item['mainValue'] += 2;
        item['convertedUnit'] += '[updated]';
        item['convertedValue'] += 2;

    }

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
            // validate.product(data);
            data.category.should.equal(createdData.category);
            data.default.mainUnit.should.equal(createdData.default.mainUnit);// += '[updated]';
            data.default.mainValue.should.equal(createdData.default.mainValue);// +=2;
            data.default.convertedUnit.should.equal(createdData.default.convertedUnit);// += '[updated]';
            data.default.convertedValue.should.equal(createdData.default.convertedValue);// +=2;

            for (var i = 0; i < data.units.length; i++) {
                data.units[i]['mainUnit'].should.equal(createdData.units[i]['mainUnit']);
                data.units[i]['mainValue'].should.equal(createdData.units[i]['mainValue']);
                data.units[i]['convertedUnit'].should.equal(createdData.units[i]['convertedUnit']);
                data.units[i]['convertedValue'].should.equal(createdData.units[i]['convertedValue']);
            }
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

it('#08. should error when create new data with same category', function(done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done("Should not be able to create data with same category");
        })
        .catch(e => {
            e.errors.should.have.property('category');
            done();
        })
});

it('#09. should error with property code and name ', function(done) { 
   instanceManager.create({})
       .then(id => { 
           done("Should not be error with property code and name");
       })
       .catch(e => { 
          try
          {
              e.errors.should.have.property('category');
              //e.errors.should.have.property('name'); 
              done();
          }catch(ex)
          {
              done(ex);
          } 
       })
});