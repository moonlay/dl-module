require("should");
var helper = require("../../helper");

var CompanyManager = require("../../../src/managers/master/company-manager");
var CompanyDataUtil = require("../../data-util/master/company-data-util");
var manager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new CompanyManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#01. should error when create with duplicate code`, function (done) {
    CompanyDataUtil.getNewData()
        .then((data) => manager.create(data))
        .then((id) => manager.getSingleById(id))
        .then((data) => {
            manager.create({ code: data.code })
                .then((id) => {
                    done("Should not be able to create with duplicate code");
                })
                .catch((e) => {
                    try {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        e.errors.should.have.property("code");
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        });
});

it("#02. should success when search with keyword", function (done) {
    manager.read({ keyword: "IDR" })
        .then((e) => {
            e.should.have.property("data");
            e.data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});