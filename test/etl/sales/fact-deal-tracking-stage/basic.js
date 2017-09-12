var helper = require("../../../helper");
var Manager = require("../../../../src/etl/sales/fact-deal-tracking-stage-etl-manager");
var instanceManager = null;
var should = require("should");
var sqlHelper = require("../../../sql-helper");

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

it("#01. should success when create etl fact deal tracking stage", function (done) {
    instanceManager.run()
        .then(() => {
            done();
        })
        .catch((e) => {
            console.log(e);
            done(e);
        });
});

it("#02. should success when transforming data for fact-deal-tracking-stage", function (done) {
    var data = [
        {
            _deleted: false,
            _id: "012345",
            code: "X123456",
            _createdDate: new Date(),
            _createdBy: "Unit Test",
            boardId: "012345",
            name: "Name",
            deals: [
                {
                    stageId: "12345",
                    dealId: "12345"
                }
            ]
        }
    ];
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