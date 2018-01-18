require("should");
var helper = require("../../../helper");
var generateCode = require('../../../../src/utils/code-generator');

var kanbanDataUtil = require("../../../data-util/production/finishing-printing/kanban-data-util");
var validateKanban = require("dl-models").validator.production.finishingPrinting.kanban;
var KanbanManager = require("../../../../src/managers/production/finishing-printing/kanban-manager");
var kanbanManager = null;
var kanban;

var moment = require('moment');

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

var code;
it('#01. should success when create 20 kanban data', function (done) {

    var data = [];
    for (var i = 0; i < 20; i++) {
        kanbanDataUtil.getNewData().then(
            kan => {
                data.push(kan);
            }
        )
    }
    Promise.all(data)
        .then((result) => {
            done();
        }).catch(e => {
            done(e);
        });

});

it('#02. should success when get data monitoring Kanban', function (done) {
    var query = {};
    query.orderNo = '';
    query.sdate = '';
    query.edate = '';
    query.processTypeId = '';
    query.orderTypeId = '';
    query.proses = '';
    kanbanManager.getDataReport(query)
        .then(kanban => {
            for (var a of kanban) {
                code = a.orderNo;
            }
            kanban.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });

});

it('#03. should success when get data Kanban', function (done) {
    var query = { "keyword": code };
    kanbanManager.read(query)
        .then(kanban => {
            kanban.data.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });

});