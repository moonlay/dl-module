require("should");
var helper = require("../../helper");
var MachineManager = require("../../../src/managers/master/machine-manager");

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            manager = new MachineManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should success when get machine events", function(done) {
    manager.getMachineEvents({})
        .then((documents) => {
            //process documents
            documents.should.be.instanceof(Array);
            // documents.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});