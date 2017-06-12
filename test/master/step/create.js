require("should");
var Step = require('../../data-util/master/step-data-util');
var helper = require("../../helper");
var validate = require("dl-models").validator.master.step;

var StepManager = require("../../../src/managers/master/step-manager");
var stepManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            stepManager = new StepManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should error when create items with empty data", function (done) {
    Step.getNewData()
        .then((data) => {
            data.stepIndicators = [];
            return stepManager.create(data)
        }).then((id) => {
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

it("#02. should error when create items with duplicate data", function (done) {
    Step.getNewData()
        .then((data) => {
            var arrProcess = []
            var process1 = {
                name: `data `,
                value: `value `,
                uom: `uom `
            }
            var process2 = {
                name: `data `,
                value: `value `,
                uom: `uom `
            }
            var process3 = {
                name: "",
                value: `value `,
                uom: `uom `
            }
            arrProcess.push(process1);
            arrProcess.push(process2);
            arrProcess.push(process3);
            data.stepIndicators = arrProcess;
            return stepManager.create(data)
        }).then((id) => {
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








