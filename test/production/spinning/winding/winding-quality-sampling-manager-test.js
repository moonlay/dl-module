'use strict';

var should = require('should');
var helper = require("../../../helper");
var assert = require('assert');
var validator = require('dl-models').validator.production;
var validatorMaster = require('dl-models').validator.master;
var WindingQualitySamplingManager = require("../../../../src/managers/production/spinning/winding/winding-quality-sampling-manager");
var MachineManager = require("../../../../src/managers/master/machine-manager");
var ProductManager = require("../../../../src/managers/master/Product-manager");
var usterManager = require("../../../../src/managers/master/uster-classification-manager");
var UomUtil = require('../../../data-util/master/uom-data-util');
var UnitUtil = require('../../../data-util/master/unit-data-util');
var instanceManager = null;
var instanceManagerMachine = null;
var instanceManagerProduct = null;
var instanceManagerUster = null;
var Machine = require('dl-models').master.Machine;
var Product = require('dl-models').master.Product;
var UsterClassification = require('dl-models').master.UsterClassification;

function getData() {
    var WindingQualitySampling = require('dl-models').production.spinning.winding.WindingQualitySampling;
    var windingQualitySampling = new WindingQualitySampling();

    var now = new Date();

    windingQualitySampling.spinning = 'SPINNING 1';
    windingQualitySampling.date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    windingQualitySampling.U = 50;
    windingQualitySampling.thin = 1;
    windingQualitySampling.thick = 1;
    windingQualitySampling.neps = 1;
    windingQualitySampling.ipi = windingQualitySampling.thin + windingQualitySampling.thick + windingQualitySampling.neps;
    windingQualitySampling.sys = 10;
    windingQualitySampling.elongation=10;

    return windingQualitySampling;
}

function getDataUsterClassification() {
    var UsterClassification = require('dl-models').master.UsterClassification;
    var usterClassification = new UsterClassification();

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    usterClassification.thin = 1;
    usterClassification.thick = 10;
    usterClassification.neps = 30;
    usterClassification.ipi = usterClassification.thin + usterClassification.thick + usterClassification.neps;
    usterClassification.grade = 'Good';

    return usterClassification;
}

function getDataProduct(){
    return Promise.resolve(UomUtil.getTestData())
        .then(uom => {
            var Product = require('dl-models').master.Product;
            var now = new Date();
            var stamp = now / 1000 | 0;
            var code = stamp.toString(36);

            var product = new Product();
            product.code = code;
            product.name = `name[${code}]`;
            product.price = 50;
            product.description = `description for ${code}`;
            product.tags = `Benang Spinning ${code}`;
            product.properties = [];
            product.uom = uom;
            product.uomId = uom._id;

            return product;
        });
}

function getDataMachine() {
    return Promise.resolve(UnitUtil.getTestData())
        .then(unit => {
            var Machine = require('dl-models').master.Machine;
            var machine = new Machine();

            var now = new Date();
            var stamp = now / 1000 | 0;
            var code = stamp.toString(36);

            machine.name = `name [${code}]`;
            machine.unit = unit;
            machine.unitId = unit._id;
            machine.process = `process [${code}]`;
            machine.manufacture=`manufacture [${code}]`;
            machine.year = now.getFullYear();
            machine.machineCondition=`machine condition [${code}]`;

            return machine;
        });
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new WindingQualitySamplingManager(db, {
                username: 'unit-test'
            });
            instanceManagerMachine = new MachineManager(db, {
                username: 'unit-test'
            });
            instanceManagerProduct = new ProductManager(db, {
                username: 'unit-test'
            });
            instanceManagerUster = new usterManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var productId;
it('#01. should success when create new data product', function (done) {
    getDataProduct().then(data => {
        instanceManagerProduct.create(data)
            .then(id => {
                id.should.be.Object();
                productId = id;
                done();
            })
            .catch(e => {
                done(e);
            })
	})
    .catch(e => {
        done(e);
    })
});

var product;
it(`#02. should success when get created data product with id`, function (done) {
    instanceManagerProduct.getSingleByQuery({ _id: productId })
        .then(data => {
            validatorMaster.product(data);
            data.should.instanceof(Object);
            product = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var machineId;
it('#03. should success when create new data Machine', function (done) {
    getDataMachine().then(data => {
        instanceManagerMachine.create(data)
            .then(id => {
                id.should.be.Object();
                machineId = id;
                done();
            })
            .catch(e => {
            done(e);
            })
    })
    .catch(e => {
        done(e);
    })
});

var machine;
it(`#04. should success when get created data Machine with id`, function (done) {
    instanceManagerMachine.getSingleByQuery({ _id: machineId })
        .then(data => {
            validatorMaster.machine(data);
            data.should.instanceof(Object);
            machine = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var usterId;
it('#05. should success when create new data Uster Classification', function (done) {
    var data = getDataUsterClassification();
    data.threadName = product.name;
    data.thread = product;
    data.productId = product._id;
    instanceManagerUster.create(data)
        .then(id => {
            id.should.be.Object();
            usterId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var uster;
it(`#06. should success when get created data uster classification with id`, function (done) {
    instanceManagerUster.getSingleByQuery({ _id: usterId })
        .then(data => {
            validatorMaster.usterClassification(data);
            data.should.instanceof(Object);
            uster = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#07. should success when read data', function (done) {
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
it('#08. should success when create new data', function (done) {
    var data = getData();
    data.machine = machine;
    data.machineId = machine._id;
    data.threadName = product.name;
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
it(`#09. should success when get created data with id`, function (done) {
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

it('#10. should error when create new data with same thread, machine, spinning and date', function (done) {
    var data = getData();
    data.machine = machine;
    data.machineId = machine._id;
    data.threadName = product.name;
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            done("Should not be able to create data with same thread, machine, spinning and date");
        })
        .catch(e => {
            e.errors.should.have.property('spinning');
            done();
        })
});

it('#11. should error when create new data with product has no uster classification', function (done) {
    getDataProduct().then(data => {
        instanceManagerProduct.create(data)
            .then(id => {
                id.should.be.Object();
                instanceManagerProduct.getSingleByQuery({ _id: id })
                    .then(newProduct => {
                        validatorMaster.product(newProduct);
                        newProduct.should.instanceof(Object);
                        var dataWindingQualitySampling = getData();
                        dataWindingQualitySampling.spinning = 'Spinning 2';
                        dataWindingQualitySampling.machine = machine;
                        dataWindingQualitySampling.machineId = machine._id;
                        dataWindingQualitySampling.threadName = newProduct.name;
                        instanceManager.create(dataWindingQualitySampling)
                            .then(qualityId => {
                                qualityId.should.be.Object();
                                done("Should not be able to create data with same product has no uster classification");
                            })
                            .catch(e => {
                                e.errors.should.have.property('threadName');
                                done();
                            })
                })
                .catch(e => {
                    done(e);
                })
            })
            .catch(e => {
                done(e);
            })
	})
    .catch(e => {
        done(e);
    })
});

it(`#12. should success when update created data`, function (done) {
    
    var newDate = new Date();
    newDate.setDate(newDate.getDate() + (-1));

    createdData.spinning += ' [updated]';
    createdData.date = newDate;
    createdData.U += 1;
    createdData.thin += 1;
    createdData.thick += 1;
    createdData.neps += 1;
    createdData.ipi = createdData.thin + createdData.thick + createdData.neps;
    createdData.sys += 1;
    createdData.elongation += 1;

    instanceManager.update(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});


it(`#13. should success when get updated data with id`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validator.spinning.winding.windingQualitySampling(data);
            data.spinning.should.equal(createdData.spinning);
            data.U.should.equal(createdData.U);
            data.thin.should.equal(createdData.thin);
            data.thick.should.equal(createdData.thick);
            data.neps.should.equal(createdData.neps);
            data.ipi.should.equal(createdData.ipi);
            data.sys.should.equal(createdData.sys);
            data.elongation.should.equal(createdData.elongation);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#14. should success when delete data`, function (done) {
    instanceManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#15. should _deleted=true`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validator.spinning.winding.windingQualitySampling(data);
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});