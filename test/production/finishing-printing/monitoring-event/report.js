require("should");
var MonitoringEvent = require('../../../data-util/production/finishing-printing/monitoring-event-data-util');
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.monitoringEvent;
var moment = require('moment');

var MonitoringEventManager = require("../../../../src/managers/production/finishing-printing/monitoring-event-manager");
var monitoringEventManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            monitoringEventManager = new MonitoringEventManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId;
it("#01. should success when create new data", function(done) {
    MonitoringEvent.getNewData()
        .then((data) => monitoringEventManager.create(data))
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
it(`#01.5. should success when get created data with id`, function(done) {
    monitoringEventManager.getSingleById(createdId)
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

it('#02. should success when get Monitoring Event Per Machine', function (done) {
    var info = {};
    info.machineId = createdData.machineId;

    monitoringEventManager.getMonitoringEventReport(info)
        .then(result => {
            var monitoringEvent = result.data;
            monitoringEvent.should.instanceof(Array);
            monitoringEvent.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#03. should success when get Monitoring Event Per Machine Event', function (done) {
    var info = {};
    info.machineEventCode = createdData.machineEvent.code;

    monitoringEventManager.getMonitoringEventReport(info)
        .then(result => {
            var monitoringEvent = result.data;
            monitoringEvent.should.instanceof(Array);
            monitoringEvent.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#04. should success when get Monitoring Event Per Production Order Number', function (done) {
    var info = {};
    info.productionOrderNumber = createdData.productionOrder.orderNo;

    monitoringEventManager.getMonitoringEventReport(info)
        .then(result => {             
            var monitoringEvent = result.data;
            monitoringEvent.should.instanceof(Array);
            monitoringEvent.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#05. should success when get Monitoring Event Per Date Start', function (done) {
    var info = {};
    info.dateFrom = createdData.dateStart;

    monitoringEventManager.getMonitoringEventReport(info)
        .then(result => {             
            var monitoringEvent = result.data;
            monitoringEvent.should.instanceof(Array);
            monitoringEvent.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#06. should success when get Monitoring Event Per Date End', function (done) {
    var info = {};
    info.dateTo = createdData.dateEnd;

    monitoringEventManager.getMonitoringEventReport(info)
        .then(result => {             
            var monitoringEvent = result.data;
            monitoringEvent.should.instanceof(Array);
            monitoringEvent.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

var resultForExcelTest = {};
it('#07. should success when get Monitoring Event using all filters', function (done) {
    var info = {};
    info.machineId = createdData.machineId;
    info.machineEventCode = createdData.machineEvent.code;
    info.productionOrderNumber = createdData.productionOrder.orderNo;
    info.dateFrom = createdData.dateStart;
    info.dateTo = createdData.dateEnd;

    monitoringEventManager.getMonitoringEventReport(info)
        .then(result => {             
            resultForExcelTest = result; 
            var monitoringEvent = result.data;
            monitoringEvent.should.instanceof(Array);
            monitoringEvent.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#08. should have NO result when dateFrom greater than dateTo', function (done) {
    var info = {};
    info.dateFrom = '2017-02-02';
    info.dateTo = '2017-01-01';

    monitoringEventManager.getMonitoringEventReport(info)
        .then(result => {             
            var monitoringEvent = result.data;
            monitoringEvent.should.instanceof(Array);
            monitoringEvent.length.should.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#09. should success when get data for Excel Report', function (done) {
    var query = {};

    monitoringEventManager.getXls(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#10. should success when get data for Excel Report using dateFrom only', function (done) {
    var query = {};
    query.dateFrom = "2017-01-01";

    monitoringEventManager.getXls(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#11. should success when get data for Excel Report using dateTo only', function (done) {
    var query = {};
    query.dateTo = "2017-01-01";

    monitoringEventManager.getXls(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#12. should success when get data for Excel Report using both dateFrom and dateTo', function (done) {
    var query = {};
    query.dateFrom = "2017-01-01";
    query.dateTo = "2017-02-01";

    monitoringEventManager.getXls(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it("#13. should success when destroy all unit test data", function(done) {
    monitoringEventManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});