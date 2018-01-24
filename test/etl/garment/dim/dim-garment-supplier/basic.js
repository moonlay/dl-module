var helper = require("../../../../helper");
var Manager = require("../../../../../src/etl/garment/dim/dim-garment-supplier-etl-manager");
var instanceManager = null;
var should = require("should");
var sqlHelper = require("../../../../sql-helper");

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

it("#01. should success when create etl for dim-garment-supplier", function (done) {
    instanceManager.run()
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when dim-garment-supplier", function (done) {
    var data = [{ code: "A", name: "V" }];
    instanceManager.transform(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should error when insert empty data", function (done) {
    instanceManager.insertQuery(this.sql, "")
        .then((id) => {
            done("should error when create with empty data");
        })
        .catch((e) => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});
