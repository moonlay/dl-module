var helper = require("../../helper");
var Manager = require("../../../src/etl/migration-log/migration-log-manager");
var migrationLogData = require("../../data-util/migration-log/migration-log-data-util");
var instanceManager = null;

var should = require("should");

before("#00. connect db", function (done) {
    Promise.all([helper])
        .then((result) => {
            var db = result[0];
            db.getDb().then((db) => {
                instanceManager = new Manager(db, {
                    username: "unit-test"
                });
                done();
            })
                .catch((e) => {
                    done(e);
                })
        });
});



var createdId;
it("#01. should success when create new data", function (done) {
    migrationLogData.getTestData()
        .then((data) => {
            instanceManager.create(data).then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
            }).catch((e) => {
                done(e);
            });
        });
});

var createdData;
it(`#02. should success when get created data with id`, function (done) {
    instanceManager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it("#03. should success when get all successful data", function (done) {
    instanceManager.getData({})
        .then((result) => {
            result.should.instanceof(Array);
            result.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            console.log(e);
            done(e);
        });
})

it("#04. should success when get data with keyword successful data", function (done) {
    var info = {};
    info.keyword = "test";
    instanceManager.getData(info)
        .then((result) => {
            result.should.instanceof(Array);
            result.length.should.not.equal(0);
            done();
        })
        .catch((e) => {

            done(e);
        });
})

it("#05. should success when destroy all unit test data", function (done) {
    instanceManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});