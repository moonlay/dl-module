'use strict';

var should = require('should');
var helper = require("../../../helper");
var assert = require('assert');
var validator = require('dl-models').validator;
var validatorMaster = require('dl-models').validator.master;
var WindingQualitySamplingManager = require("../../../../src/managers/production/spinning/winding/winding-quality-sampling-manager");
var MachineManager = require("../../../../src/managers/master/machine-manager");
var UsterUtil = require('../../../data-util/master/uster-data-util');
var UnitUtil = require('../../../data-util/master/unit-data-util');
var instanceManager = null;
var instanceManagerMachine = null;
var Machine = require('dl-models').master.Machine;

function getData() {
    return Promise.resolve(UsterUtil.getTestData())
        .then(uster => {
            var WindingQualitySampling = require('dl-models').production.spinning.winding.WindingQualitySampling;
            var windingQualitySampling = new WindingQualitySampling();

            var now = new Date();

            windingQualitySampling.date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            windingQualitySampling.U = 50;
            windingQualitySampling.thin = 1;
            windingQualitySampling.thick = 15;
            windingQualitySampling.neps = 48;
            windingQualitySampling.sys = 10;
            windingQualitySampling.elongation=10;
            windingQualitySampling.uster = uster;
            windingQualitySampling.usterId = uster._id;

            return windingQualitySampling;
        });
}

var _unit;
var _unitId;
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
            _unit = unit;
            _unitId = unit._id;

            return machine;
        });
}

function getNewData() {
            var WindingQualitySampling = require('dl-models').production.spinning.winding.WindingQualitySampling;
            var windingQualitySampling = new WindingQualitySampling();

            var now = new Date();

            windingQualitySampling.date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            windingQualitySampling.U = 50;
            windingQualitySampling.thin = 1;
            windingQualitySampling.thick = 15;
            windingQualitySampling.neps = 48;
            windingQualitySampling.sys = 10;
            windingQualitySampling.elongation=10;

            return windingQualitySampling;
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
            done();
        })
        .catch(e => {
            done(e);
        })
});

var machineId;
it('#01. should success when create new data Machine', function (done) {
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
it(`#02. should success when get created data Machine with id`, function (done) {
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

it('#03. should success when read data', function (done) {
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
it('#04. should success when create new data', function (done) {
    getData().then(data => {
        data.machine = machine;
        data.machineId = machine._id;
        data.spinning = _unit;
        data.unitId = _unit._id;
        instanceManager.create(data)
            .then(id => {
                id.should.be.Object();
                createdId = id;
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

var createdData;
it(`#05. should success when get created data with id`, function (done) {
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

it('#06. should error when create new data with same uster, machine, spinning and date', function (done) {
    var data = getNewData();
        data.uster = createdData.uster;
        data.usterId = createdData.usterId;
        data.machine = machine;
        data.machineId = machine._id;
        data.spinning = _unit;
        data.unitId = _unit._id;
        instanceManager.create(data)
            .then(id => {
                id.should.be.Object();
                done("Should not be able to create data with same uster, machine, spinning and date");
            })
            .catch(e => {
                e.errors.should.have.property('spinning');
                done();
            })
            
});

it('#07. should error when create new data with product has no uster classification', function (done) {
    var data = getNewData();
        data.uster = {};
        data.usterId = {};
        data.machine = machine;
        data.machineId = machine._id;
        data.spinning = _unit;
        data.unitId = _unit._id;
        instanceManager.create(data)
            .then(id => {
                id.should.be.Object();
                done("Should not be able to create data with product has no uster classification");
            })
            .catch(e => {
                e.errors.should.have.property('uster');
                done();
            })
});

it('#08. should error when create new data without machine', function (done) {
    var data = getNewData();
        data.spinning = _unit;
        data.unitId = _unit._id;
        instanceManager.create(data)
            .then(id => {
                id.should.be.Object();
                done("Should not be able to create data without machine");
            })
            .catch(e => {
                e.errors.should.have.property('machine');
                done();
            })
});

it('#09. should error when create new data without spinning', function (done) {
    var data = getNewData();
        data.machine = machine;
        data.machineId = machine._id;
        instanceManager.create(data)
            .then(id => {
                id.should.be.Object();
                done("Should not be able to create data without spinning");
            })
            .catch(e => {
                e.errors.should.have.property('spinning');
                done();
            })
});

it(`#10. should success when update created data`, function (done) {
    
    var newDate = new Date();
    newDate.setDate(newDate.getDate() + (-1));

    createdData.date = newDate;
    createdData.U += 1;
    createdData.thin += 5;
    createdData.thick += 40;
    createdData.neps += 89;
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


it(`#11. should success when get updated data with id`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validator.production.spinning.winding.windingQualitySampling(data);
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

it(`#12. should success when delete data`, function (done) {
    instanceManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#13. should _deleted=true`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validator.production.spinning.winding.windingQualitySampling(data);
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});