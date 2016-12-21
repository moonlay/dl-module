var helper = require("../../helper");
var Manager = require("../../../src/etl/dim-unit-etl-manager");
var instanceManager = null;
var should = require("should");

before("#00. connect db", function(done) {
    helper.getDb()
        .then((db) => {
            instanceManager = new Manager(db, {
                username: "unit-test"
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should success when create etl for dim-unit", function(done) {
    instanceManager.run()
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});
