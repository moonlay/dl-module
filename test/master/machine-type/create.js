require("should");
var MachineType = require('../../data-util/master/machine-type-data-util');
var helper = require("../../helper");
var validate = require("dl-models").validator.master.machineType;

var MachineTypeManager = require("../../../src/managers/master/machine-type-manager");
var machineTypeManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            machineTypeManager = new MachineTypeManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should error when create with empty data ', function (done) {
    machineTypeManager.create({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                // e.errors.should.have.property('code');
                e.errors.should.have.property("name");
                e.errors.should.have.property("description");
                e.errors.should.have.property("indicators");
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

var machineType;
it('#02. should success when create new data', function (done) {
    MachineType.getNewData()
        .then(mt => {
            machineType = mt;
            validate(machineType);
            done();
        })
        .catch(e => {
            done(e);
        });
});
