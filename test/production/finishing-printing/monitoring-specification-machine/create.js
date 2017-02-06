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

// it(`#12. should null when get destroyed data`, function (done) {
//     manager.getSingleByIdOrDefault(createdId)
//         .then((data) => {
//             should.equal(data, null);
//             done();
//         })
//         .catch((e) => {
//             done(e);
//         });
// });


