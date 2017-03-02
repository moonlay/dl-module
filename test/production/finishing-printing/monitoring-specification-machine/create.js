require("should");
var MonitoringSpecificationMachine = require('../../../data-util/production/finishing-printing/monitoring-specification-machine-data-util');
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.monitoringSpecificationMachine;

var MonitoringSpecificationMachineManager = require("../../../../src/managers/production/finishing-printing/monitoring-specification-machine-manager");
var monitoringSpecificationMachineManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            monitoringSpecificationMachineManager = new MonitoringSpecificationMachineManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should error when create with empty data ', function (done) {
    monitoringSpecificationMachineManager.create({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                e.errors.should.have.property('code');
                e.errors.should.have.property('date');
                e.errors.should.have.property('time');
                e.errors.should.have.property('machineType');
                e.errors.should.have.property('items');

                done();
            }
            catch (ex) {
                done();
            }
        });
});

var monitoringSpecificationMachine;
it('#02. should success when create new data', function (done) {
    MonitoringSpecificationMachine.getNewData()
        .then(pr => {
            monitoringSpecificationMachine = pr;
            validate(monitoringSpecificationMachine);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#03. should error when create items with empty data", function (done) {
    MonitoringSpecificationMachine.getNewDataItems()
        .then((data) => monitoringSpecificationMachineManager.create(data))
        .then((id) => {
            done("Should not be able to create with empty data");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});








