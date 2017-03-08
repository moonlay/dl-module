require("should");
var helper = require("../../helper");
var MachineManager = require("../../../src/managers/master/machine-manager");
var MachineDataUtil = require("../../data-util/master/machine-data-util");

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            manager = new MachineManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should error when create with empty data", function(done) {
    manager.create({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                e.errors.should.have.property('name');
                e.errors.should.have.property('unit');
                e.errors.should.have.property('step');
                e.errors.should.have.property('machineType');
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it('#02. should error when create new data with non existent unit, step, machineType', function (done) {
    MachineDataUtil.getNewData()
        .then(machine => {

            machine.unit._id = 'randomId';
            machine.step._id = 'randomId';
            machine.machineType._id = 'randomId';

            manager.create(machine)
                .then(id => {
                    done("should error when create new data with non existent unit, step, machineType");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('unit');
                        e.errors.should.have.property('step');
                        e.errors.should.have.property('machineType');
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch(e => {
            done(e);
        });
});

it('#03. should error when create new data with monthly capacity less then 0', function (done) {
    MachineDataUtil.getNewData()
        .then(machine => {

            machine.monthlyCapacity = -1; 

            manager.create(machine)
                .then(id => {
                    done("should error when create new data with monthly capacity less then 0");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('monthlyCapacity');
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch(e => {
            done(e);
        });
});