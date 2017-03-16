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
                e.errors.should.have.property('steps');
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
            machine.machineType._id = 'randomId';
            var steps = [];
            for(var a of machine.steps){
                a.stepId = 'randomId';
                steps.push(a);
            }
            machine.steps = steps;

            manager.create(machine)
                .then(id => {
                    done("should error when create new data with non existent unit, step, machineType");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('unit');
                        e.errors.should.have.property('machineType');
                        e.errors.should.have.property('steps');
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

it('#03. should error when create new data with non id on data step', function (done) {
    MachineDataUtil.getNewData()
        .then(machine => {
            var steps = [];
            for(var a of machine.steps){
                delete a.stepId;
                steps.push(a);
            }
            machine.steps = steps;

            manager.create(machine)
                .then(id => {
                    done("should error when create new data with non id on data step");
                })
                .catch(e => {
                    try {
                        var a = e;
                        e.errors.should.have.property('steps');
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

it('#04. should error when create new data with duplicate step', function (done) {
    MachineDataUtil.getNewData()
        .then(machine => {
            var step = {};
            for(var a of machine.steps){
                step = a;
                break;
            }
            machine.steps.push(step);

            manager.create(machine)
                .then(id => {
                    done("should error when create new data with duplicate step");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('steps');
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

it('#05. should error when create new data with monthly capacity less then 0', function (done) {
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