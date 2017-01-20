'use strict';

var should = require('should');
var helper = require("../../helper");
var InstructionManager = require("../../../src/managers/master/instruction-manager");
var instructionManager = null;
var dataUtil = require("../../data-util/master/instruction-data-util");
var validate = require("dl-models").validator.master.instruction;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instructionManager = new InstructionManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdData;
var createdId;
it(`#01. should success when get created new data`, function (done) {
    dataUtil.getNewData()
    .then((data) => createdData=data)
            .then((data) => instructionManager.create(data))
            .then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
            })
            .catch((e) => {
                done(e);
            });
});

it(`#02. should success when get material from created data`, function (done) {
    var key=createdData.material;
    var filter=createdData.orderTypeId;
    instructionManager.getMaterial(key,filter).then(
        instruction => {
            instruction.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
    });
});

it(`#03. should success when get construction from created data`, function (done) {
    var key=createdData.construction;
    var orderId=createdData.orderTypeId;
    var materialId=createdData.materialId;
    instructionManager.getConstruction(key,orderId,materialId).then(
        instruction => {
            instruction.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
    });
});

it(`#04. should success when destroy data with id`, function(done) {
    instructionManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#05. should null when get destroyed data`, function(done) {
    instructionManager.getSingleByIdOrDefault(createdId)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});