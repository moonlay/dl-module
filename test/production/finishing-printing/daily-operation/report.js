require("should");
var dataUtil = require("../../../data-util/production/finishing-printing/daily-operation-data-util");
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.dailyOperation;
var codeGenerator = require('../../../../src/utils/code-generator');
var moment = require('moment');

var DailyOperationManager = require("../../../../src/managers/production/finishing-printing/daily-operation-manager");
var dailyOperationManager;
var dateNow;
var dateBefore;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            dailyOperationManager = new DailyOperationManager(db, {
                username: 'dev'
            });
            dateNow = new Date();
            dateBefore = new Date();
            done();
        })
        .catch(e => {
            done(e);
        });
});

var dataDaily;
var dataInput;
it("#01. should success when create data", function (done) {
    dataUtil.getNewData("input")
        .then(data => {
            dateBefore = dateBefore.setDate(dateBefore.getDate() - 10);
            data.dateInput = moment(dateBefore).format('YYYY-MM-DD');
            dataInput = data;
            dailyOperationManager.create(data)
                .then((item) => {
                    dailyOperationManager.getSingleByIdOrDefault(item)
                        .then(daily => {
                            validate(daily);
                            dataDaily = daily;
                            done();
                        })
                        .catch((e) => {
                            done(e);
                        });
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when get read data", function (done) {
    dailyOperationManager.read({})
        .then((item) => {
            var daily = item.data;
            daily.should.instanceof(Array);
            daily.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success when get read data with keyword", function (done) {
    dailyOperationManager.read({ "keyword": dataDaily.step.process })
        .then((item) => {
            var daily = item.data;
            daily.should.instanceof(Array);
            daily.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should success when get report without parameter", function (done) {
    dailyOperationManager.getDailyOperationReport({})
        .then((item) => {
            var daily = item.data;
            daily.should.instanceof(Array);
            daily.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should success when get report with machine parameter", function (done) {
    dailyOperationManager.getDailyOperationReport({ "machine": dataDaily.machineId })
        .then((item) => {
            var daily = item.data;
            daily.should.instanceof(Array);
            daily.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should success when get report with kanban parameter", function (done) {
    dailyOperationManager.getDailyOperationReport({ "kanban": dataDaily.kanbanId })
        .then((item) => {
            var daily = item.data;
            daily.should.instanceof(Array);
            daily.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var dataReport;
it("#07. should success when get report with date parameter", function (done) {
    dailyOperationManager.getDailyOperationReport({ "dateFrom": moment(dateBefore).format('YYYY-MM-DD'), "dateTo": moment(dateNow).format('YYYY-MM-DD') })
        .then((item) => {
            dataReport = item;
            dataReport.data.should.instanceof(Array);
            dataReport.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

// it("#08. should success when get data for Excel", function (done) {
//     dailyOperationManager.getXls(dataReport, { "dateFrom": moment(dateBefore).format('YYYY-MM-DD'), "dateTo": moment(dateNow).format('YYYY-MM-DD') }, 7)
//         .then((item) => {
//             item.should.have.property('data');
//             item.should.have.property('options');
//             item.should.have.property('name');
//             done();
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

it("#08.(2) should success create Excel with id", function (done) {
    var _idExcel = [];
    for (var temp of dataReport.data) {
        temp.kanban = null;
        temp.machine = null;
        temp.dateInput = null;
        temp.timeInput = null;
        temp.input = null;
        temp.dateOutput = null;
        temp.timeOutput = null;
        temp.goodOutput = null;
        temp.badOutput = null;
        temp.badOutputDescription = null;
        _idExcel.push(temp)
    }

    dataReport.data = _idExcel;

    dailyOperationManager.getXls(dataReport, { "dateFrom": moment(dateBefore).format('YYYY-MM-DD'), "dateTo": moment(dateNow).format('YYYY-MM-DD') }, 7)
        .then((item) => {
            item.should.have.property('data');
            item.should.have.property('options');
            item.should.have.property('name');
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#08.(3) should success create Excel with id", function (done) {
    var _idExcel = [];
    for (var temp of dataReport.data) {
        temp.kanban = null;
        temp.machine = null;
        temp.dateInput = null;
        temp.timeInput = null;
        temp.input = null;
        temp.dateOutput = null;
        temp.timeOutput = null;
        temp.goodOutput = null;
        temp.badOutput = null;
        temp.badOutputDescription = null;
        _idExcel.push(temp)
    }

    dataReport.data = _idExcel;

    dailyOperationManager.getXls(dataReport, { "dateFrom": moment(dateBefore).format('YYYY-MM-DD') }, 7)
        .then((item) => {
            item.should.have.property('data');
            item.should.have.property('options');
            item.should.have.property('name');
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#08.(4) should success create Excel with id", function (done) {
    var _idExcel = [];
    for (var temp of dataReport.data) {
        temp.kanban = null;
        temp.machine = null;
        temp.dateInput = null;
        temp.timeInput = null;
        temp.input = null;
        temp.dateOutput = null;
        temp.timeOutput = null;
        temp.goodOutput = null;
        temp.badOutput = null;
        temp.badOutputDescription = null;
        _idExcel.push(temp)
    }

    dataReport.data = _idExcel;

    dailyOperationManager.getXls(dataReport, { "dateTo": moment(dateNow).format('YYYY-MM-DD') }, 7)
        .then((item) => {
            item.should.have.property('data');
            item.should.have.property('options');
            item.should.have.property('name');
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var dailyOutput;
it("#09. should success when create data output", function (done) {
    dataUtil.getNewData("output")
        .then(data => {
            data.dateOutput = moment(dateNow).format('YYYY-MM-DD');
            data.kanban = dataInput.kanban;
            data.kanbanId = dataInput.kanbanId;
            data.machine = dataInput.machine;
            data.machineId = dataInput.machineId;
            data.step = dataInput.step;
            data.stepId = dataInput.stepId;
            dailyOperationManager.create(data)
                .then((item) => {
                    dailyOperationManager.getSingleByIdOrDefault(item)
                        .then(daily => {
                            validate(daily);
                            dailyOutput = daily;
                            done();
                        })
                        .catch((e) => {
                            done(e);
                        });
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#09.(2) should success when get data", function (done) {
    var data= dataInput;
    var filter = {
        "machineCode": data.machine.code,
        "type": "input",
        "dateFrom": new Date(),
        "dateTo": new Date(),
    };
    dailyOperationManager.getMonitoringMontlyReport(filter)
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
})

it("#10. should success when get report with date parameter", function (done) {
    dailyOperationManager.getDailyOperationBadReport({ "dateFrom": moment(dateBefore).format('YYYY-MM-DD'), "dateTo": moment(dateNow).format('YYYY-MM-DD') })
        .then((result) => {
            result.should.instanceof(Array);
            result.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
var queryDailyMachine = {};
var xlsDailyMachine;
var monthList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
it("#11. should success when get report daily machine", function (done) {

    var temp = new Date().getFullYear() + 1;
    queryDailyMachine.area = "Area Pre Treatment";
    queryDailyMachine.dateFrom = "1900-01-01";
    queryDailyMachine.dateTo = "" + temp + "-01-01";
    queryDailyMachine.order = {
        "_id.date": 1
    };

    dailyOperationManager.getDailyMachine(queryDailyMachine, 7)
        .then((result) => {
            result.info.should.instanceof(Array);
            result.info.length.should.not.equal(0);
            xlsDailyMachine = result.info;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#12. should success when get report daily machine with order asc", function (done) {
    queryDailyMachine.order = {
        "_id.day": "asc"
    };

    dailyOperationManager.getDailyMachine(queryDailyMachine, 7)
        .then((result) => {
            result.info.should.instanceof(Array);
            result.info.length.should.not.equal(0);
            xlsDailyMachine = result.info;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#13. should success when get report daily machine with order desc", function (done) {
    queryDailyMachine.order = {
        "_id.day": "desc"
    };

    dailyOperationManager.getDailyMachine(queryDailyMachine, 7)
        .then((result) => {
            result.info.should.instanceof(Array);
            result.info.length.should.not.equal(0);
            xlsDailyMachine = result.info;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#14. should success when get report with date parameter", function (done) {

    var dataXls = {}
    dataXls = {
        info: xlsDailyMachine
    }

    dailyOperationManager.getXlsDailyMachine(dataXls, queryDailyMachine, 7)
        .then((result) => {
            result.data.should.instanceof(Array);
            result.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it("#15. should success when destroy all unit test data", function (done) {
    dailyOperationManager.destroy(dailyOutput._id)
        .then((result) => {
            dailyOperationManager.destroy(dataDaily._id)
                .then((result1) => {
                    result.should.be.Boolean();
                    result.should.equal(true);
                    result1.should.be.Boolean();
                    result1.should.equal(true);
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});




