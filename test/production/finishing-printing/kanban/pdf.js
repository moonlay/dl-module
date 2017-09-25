require("should");
var Kanban = require("../../../data-util/production/finishing-printing/kanban-data-util");
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.kanban;
var moment = require('moment');

var KanbanManager = require("../../../../src/managers/production/finishing-printing/kanban-manager");
var kanbanManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            kanbanManager = new KanbanManager(db, {
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
    Kanban.getNewData()
        .then((data) => kanbanManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#02. should success when create pdf', function (done) {
    var query = {};

    kanbanManager.pdf(createdId, 7)
        .then(pdfData => {
            done();
        }).catch(e => {
            done(e);
        });
});

it("#03. should success when destroy all unit test data", function (done) {
    kanbanManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});