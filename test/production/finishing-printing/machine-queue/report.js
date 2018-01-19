require("should");
var DailyOperation = require('../../../data-util/production/finishing-printing/daily-operation-data-util');
var helper = require("../../../helper");
var moment = require("moment");

var KanbanManager = require("../../../../src/managers/production/finishing-printing/kanban-manager");
var kanbanManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            kanbanManager = new KanbanManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

let data;
it("#01. should success when get Machine Queue Report", function (done) {
    DailyOperation.getNewTestData()
        .then((data) => {
            let info = {
                orderType: "",
                year: moment().format('YYYY'),
                machine: data.kanban.instruction.steps[0].machine.name
            };

            return kanbanManager.getMachineQueueReport(info);
        })
        .then((docs) => {
            data = docs;
            docs.should.instanceof(Array);
            docs.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when get Machine Queue Xls", function (done) {
    kanbanManager.getMachineQueueXls({ data: data })
        .then((xls) => {
            xls.should.have.property('data');
            xls.should.have.property('options');
            xls.should.have.property('name');
            done();
        })
        .catch((e) => {
            done(e);
        });
});