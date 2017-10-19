var helper = require("../../helper");
var Buyer = require("../../data-util/master/garment-buyer-data-util");
var BuyerManager = require("../../../src/managers/master/garment-buyer-manager");
var instanceManager = null;
var validate = require("dl-models").validator.master.buyer;

var should = require("should");

before("#00. connect db", function(done) {
    helper.getDb()
        .then((db) => {
            instanceManager = new BuyerManager(db, {
                username: "unit-test"
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should success when create new data with tempo value is 0", function(done) {
    Buyer.getNewData()
        .then(data => {
            data.tempo = 0;
            instanceManager.create(data)
            .then(id => {
                id.should.be.Object();
                instanceManager.destroy(id)
                    .then(() => {
                        done();
                    })
                .catch((e) => {
                    done(e);
                });
            })
            .catch((e) => {
                done(e);
            });
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should error when create new data with tempo less then 0", function(done) {
    Buyer.getNewData()
        .then(data => {
            data.tempo = -1;
            instanceManager.create(data)
            .then(id => {
                done("Should not be able to create new data with tempo less then 0"); 
            })
            .catch((e) => {
                e.errors.should.have.property("tempo");
                done();
            });
        })
        .catch((e) => {
            done(e);
        });
});