require("should");
var helper = require("../../helper");

var ContactManager = require("../../../src/managers/master/contact-manager");
var manager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new ContactManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should error when create with empty first name", function (done) {
    manager.create({ firstName: "" })
        .then((id) => {
            done("Should not be able to create with empty first name");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});

it("#02. should error when create with empty company", function (done) {
    manager.create({ company: "" })
        .then((id) => {
            done("Should not be able to create with empty first name");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});

it("#03. should error when create with unknown company", function (done) {
    manager.create({ company: { _id: "" } })
        .then((id) => {
            done("Should not be able to create with unknown company");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});

it("#04. should success when search with keyword", function (done) {
    manager.read({ keyword: "Moonlay Technologies" })
        .then((e) => {
            e.should.have.property("data");
            e.data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});