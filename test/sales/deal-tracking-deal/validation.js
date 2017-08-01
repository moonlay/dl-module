require("should");
var helper = require("../../helper");

var DealTrackingDealManager = require("../../../src/managers/sales/deal-tracking-deal-manager");
var manager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new DealTrackingDealManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should error when create with empty name", function (done) {
    manager.create({ name: "" })
        .then((id) => {
            done("Should not be able to create with empty name");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                e.errors.should.have.property("name");
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#02. should error when create with unknown company", function (done) {
    manager.create({ company: { _id: "" } })
        .then((id) => {
            done("Should not be able to create with unknown company");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                e.errors.should.have.property("company");
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#03. should error when create with unknown contact", function (done) {
    manager.create({ contact: { _id: "" } })
        .then((id) => {
            done("Should not be able to create with unknown contact");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                e.errors.should.have.property("contact");
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#04. should error when create with empty close date", function (done) {
    manager.create({ closeDate: "" })
        .then((id) => {
            done("Should not be able to create with empty close date");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                e.errors.should.have.property("closeDate");
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#05. should success when search with keyword", function (done) {
    manager.read({ keyword: "Deal Status" })
        .then((e) => {
            e.should.have.property("data");
            e.data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});