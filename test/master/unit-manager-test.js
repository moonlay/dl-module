var helper = require("../helper");
var UnitManager = require("../../src/managers/master/unit-manager");
var instanceManager = null;
var validator = require('dl-models').validator.unit;

var DivisionUtil = require('../data-util/master/division-data-util');
var division;
require("should");

function getData() {
    return Promise.resolve(DivisionUtil.getTestData())
        .then(div => {
            division = div;

            var Unit = require('dl-models').master.Unit;
            var unit = new Unit();

            var now = new Date();
            var stamp = now / 1000 | 0;
            var code = stamp.toString(36);

            unit.code = code;
            unit.divisionId = division._id;
            unit.division = division;
            unit.name = `unit [${code}]`;
            unit.description = `desc[${code}]`;
            return unit;
        });
}

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            instanceManager = new UnitManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId;
it('#01. should success when create new data', function(done) {
    getData().then(data => {
            instanceManager.create(data)
                .then(id => {
                    id.should.be.Object();
                    createdId = id;
                    done();
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should error when create with empty data', function(done) {
    var data = {};
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch(e => {
            e.errors.should.have.property('division');
            e.errors.should.have.property('name');
            done();
        })
});
