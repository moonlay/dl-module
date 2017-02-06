var helper = require("../../helper");
var Manager = require("../../../src/etl/fact-monitoring-event-etl-manager");
var instanceManager = null;
var should = require("should");
var sqlHelper = require("../../sql-helper");

before("#00. connect db", function (done) {
    Promise.all([helper, sqlHelper])
        .then((result) => {
            var db = result[0];
            var sql = result[1];
            db.getDb().then((db) => {
                instanceManager = new Manager(db, {
                    username: "unit-test"
                }, sql);
                done();
            })
                .catch((e) => {
                    done(e);
                })
        });
});

it("#01. should success when create etl fact-purchasing", function (done) {
    instanceManager.run()
        .then((a) => {
            console.log(a);
            done(a);
        })
        .catch((e) => {
            console.log(e);
            done(e);
        });
});