require("should");
var helper = require("../../helper");

var DealTrackingBoardManager = require("../../../src/managers/sales/deal-tracking-board-manager");
var manager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new DealTrackingBoardManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should error when create with empty title", function (done) {
    manager.create({ title: "" })
        .then((id) => {
            done("Should not be able to create with empty title");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                e.errors.should.have.property("title");
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#02. should error when create with unknown currency", function (done) {
    manager.create({ currency: { _id: "" } })
        .then((id) => {
            done("Should not be able to create with unknown currency");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                e.errors.should.have.property("currency");
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#03. should success when search with keyword", function (done) {
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