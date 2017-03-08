var helper = require("../../helper");
var Manager = require("../../../src/etl/dim-division-etl-manager");
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

it("#01. should success when create etl for dim-division", function (done) {
    instanceManager.run()
        .then((a) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});


var data = [{}, {}];

it("#02. should success when transforming data", function (done) {
    instanceManager.transform(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should error when load empty data", function (done) {
    instanceManager.load({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#04. should error when insert empty data", function (done) {
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

// it("#05. should success when load data", function (done) {
//     var data = [];
//     instanceManager.extract([{ finish: new Date(1970, 1, 1) }])
//         .then((data) => instanceManager.transform([]))
//         .then((data) => instanceManager.load([]))
//         .then(() => {
//             done();
//         })
//         .catch((e) => {
//             done(e);
//         });
// });