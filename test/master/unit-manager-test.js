
var helper = require("../helper");
var UnitManager = require("../../src/managers/master/unit-manager");
var instanceManager = null;
var validator = require('dl-models').validator.unit;

require("should");

function getData() {
    var Unit = require('dl-models').master.Unit;
    var unit = new Unit();

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    unit.code = code;
    unit.division = `division[${code}]`;
    unit.subDivision = `subdivison [${code}]`;
    unit.description = `desc[${code}]`;
    return unit;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new UnitManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;
it('#01. should success when create new data', function (done) {
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

it('#02. should error when create new data', function (done) {
    var data = {};
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch(e => {
            e.errors.should.have.property('division');
            e.errors.should.have.property('subDivision');
            done();
        })
});