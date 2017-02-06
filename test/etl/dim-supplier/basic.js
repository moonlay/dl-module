var helper = require("../../helper");
var Manager = require("../../../src/etl/dim-supplier-etl-manager");
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
                });
        });
});

it("#01. should success when create etl for dim-supplier", function (done) {
    instanceManager.run()
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});
