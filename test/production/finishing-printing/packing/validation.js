require("should");
var Packing = require('../../../data-util/production/finishing-printing/packing-data-util');
var helper = require("../../../helper");

var PackingManager = require("../../../../src/managers/production/finishing-printing/packing-manager");
var packingManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            packingManager = new PackingManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should error when create with duplicate lot and grade", function (done) {
    Packing.getNewDuplicateLotTestData()
        .then((data) => packingManager.create(data))
        .then((id) => {
            done("Should error when create with duplicate lot and grade");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});