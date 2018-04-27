var helper = require("../../../helper");
var Manager = require("../../../../src/etl/dim/dim-buyer-etl-manager");
var instanceManager = null;
var should = require("should");
var sqlMock = require("../../../sql-mock");

before("#00. connect db", function (done) {
    Promise.all([helper])
        .then((result) => {
            var db = result[0];

            db.getDb().then((db) => {
                instanceManager = new Manager(db, {
                    username: "unit-test"
                }, sqlMock);
                done();
            })
                .catch((e) => {
                    done(e);
                })
        });
});

it("#01. should success when create etl for dim-buyer", function (done) {
    instanceManager.run()
        .then((a) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when transforming data for dim-category", function (done) {
    var data = [{}, {}];
    instanceManager.transform(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

// it("#03. should error when load empty data", function (done) {
//     instanceManager.load({})
//         .then(id => {
//             done("should error when create with empty data");
//         })
//         .catch(e => {
//             try {                
//                 done();
//             }
//             catch (ex) {
//                 done(ex);
//             }
//         });
// });

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
