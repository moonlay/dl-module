require("should");
var MonitoringSpecificationMachine = require('../../../data-util/production/finishing-printing/monitoring-specification-machine-data-util');
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.monitoringSpecificationMachine;
var moment = require('moment');

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

var createdId;
it("#01. should success when create new data", function (done) {
    MonitoringSpecificationMachine.getNewData()
        .then((data) => monitoringSpecificationMachineManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdData;
it(`#02. should success when get created data with id`, function (done) {
    monitoringSpecificationMachineManager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            validate(data);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});


var resultForExcelTest = {};
it('#03. should success when create report', function (done) {
    var info = {};
    info.machineId = createdData.machineId;
    info.productionOrderId = createdData.productionOrderId;
    info.dateFrom = createdData.date;
    info.dateTo = createdData.date;

    monitoringSpecificationMachineManager.getMonitoringSpecificationMachineReport(info)
        .then(result => {
            resultForExcelTest = result;
            var monitoringSpecificationMachine = result.data;
            monitoringSpecificationMachine.should.instanceof(Array);
            monitoringSpecificationMachine.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});


it('#04. should success when get data for Excel Report', function (done) {
    var query = {};

    monitoringSpecificationMachineManager.getXls(resultForExcelTest, query)
        .then(xlsData => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});


it("#05. should success when destroy all unit test data", function (done) {
    monitoringSpecificationMachineManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
