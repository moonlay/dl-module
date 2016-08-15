'use strict';

var should = require('should');
var helper = require("../helper");
var POGarmentSparepartManager = require("../../src/managers/po/po-garment-sparepart-manager");
var instanceManager = null;

function getData() {
    var POGarmentSparepart = require('dl-models').po.POGarmentSparePart;
    var Supplier = require('dl-models').core.Supplier;
    var UoM_Template = require('dl-models').core.UoM_Template;
    var UoM = require('dl-models').core.UoM;
    var SparepartValue = require('dl-models').po.SparepartValue;
    var Sparepart = require('dl-models').core.Sparepart;

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    var pOGarmentSparepart = new POGarmentSparepart();
    pOGarmentSparepart.RONo = '1' + code + stamp;
    pOGarmentSparepart.PRNo = '2' + code + stamp;
    pOGarmentSparepart.PONo = '3' + code + stamp;
    pOGarmentSparepart.ppn = 10;
    pOGarmentSparepart.deliveryDate = new Date();
    pOGarmentSparepart.termOfPayment = 'Tempo 2 bulan';
    pOGarmentSparepart.deliveryFeeByBuyer = true;
    pOGarmentSparepart.PODLNo = '';
    pOGarmentSparepart.description = 'SP1';
    pOGarmentSparepart.supplierID = {};

    var supplier = new Supplier({
        code: '123',
        name: 'hot',
        description: 'hotline',
        phone: '0812....',
        address: 'test',
        local: true
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

    var sparepart = new Sparepart({
        code: '22',
        name: 'hotline',
        description: 'hotline123',
        UoM: _uom
    });

    var sparepartValue = new SparepartValue({
        qty: 0,
        unit: '',
        price: 0,
        sparepart: sparepart
    });
    var _spareparts = [];
    _spareparts.push(sparepartValue);

    pOGarmentSparepart.supplier = supplier;
    pOGarmentSparepart.items = _spareparts;
    return pOGarmentSparepart;
}

var supplierID = '57b141c85340483fd07d81b9';

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new POGarmentSparepartManager(db, {
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



// var createdId;
// it('#03. should error when create new data with exists reference', function (done) {
//     var data = getData();
//     instanceManager.create(data)
//         .then(id => {
//             done("should error when create new data with exists reference");
//         })
//         .catch(e => {
//             e.errors.should.have.property("code");
//             e.errors.code.should.equal("RO, PR, da already exists");
//             done();
//         })
// });

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
    createdData.PRNo += '[updated]';
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

// it('#07. should error when create new data with same code', function (done) {
//     var data = Object.assign({}, createdData);
//     delete data._id;
//     instanceManager.create(data)
//         .then(id => {
//             id.should.be.Object();
//             createdId = id;
//             done("Should not be able to create data with same code");
//         })
//         .catch(e => {
//             e.errors.should.have.property('code');
//             done();
//         })
// });

// it('#08. should error with property code and name ', function (done) {
//     instanceManager.create({})
//         .then(id => {
//             done("Should not be error with property code and name");
//         })
//         .catch(e => {
//             try {
//                 e.errors.should.have.property('code');
//                 e.errors.should.have.property('name');
//                 done();
//             } catch (ex) {
//                 done(ex);
//             }
//         })
// });
