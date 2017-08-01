require("should");
var helper = require("../../helper");

var DealTrackingStageManager = require("../../../src/managers/sales/deal-tracking-stage-manager");
var DealTrackingStageDataUtil = require("../../data-util/sales/deal-tracking-stage-data-util");
var manager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new DealTrackingStageManager(db, {
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

it("#02. should success when update stage deal", function (done) {
    DealTrackingStageDataUtil.getTestData()
        .then((data) => {
            data.type = "Activity";
            data.deals.push("");
            
            manager.update(data)
                .then((data) => {
                    data.ok.should.equal(1);
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
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