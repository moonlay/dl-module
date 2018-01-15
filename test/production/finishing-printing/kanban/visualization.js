require("should");
var DailyOperation = require("../../../data-util/production/finishing-printing/daily-operation-data-util");
var helper = require("../../../helper");

var DailyOperationManager = require("../../../../src/managers/production/finishing-printing/daily-operation-manager");
var dailyOperationManager = null;
var KanbanManager = require("../../../../src/managers/production/finishing-printing/kanban-manager");
var kanbanManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            dailyOperationManager = new DailyOperationManager(db, {
                username: 'dev'
            });
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
var kanbanId;
it("#01. should success when create new data", function (done) {
    DailyOperation.getNewData()
        .then((data) => {
            kanbanId = data.kanbanId;
            return dailyOperationManager.create(data)
        })
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when read visualization data", function (done) {
    kanbanManager.readVisualization({
        filter: {
            _id: kanbanId
        }
    })
        .then((documents) => {
            documents.should.have.property("data");
            documents.data.should.be.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success when destroy all unit test data", function (done) {
    dailyOperationManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
