var helper = require("../../helper");
var Supplier = require("../../data-util/master/garment-supplier-data-util");
var SupplierManager = require("../../../src/managers/master/garment-supplier-manager");
var instanceManager = null;
var validate = require("dl-models").validator.master.supplier;

var should = require("should");

before("#00. connect db", function(done) {
    helper.getDb()
        .then((db) => {
            instanceManager = new SupplierManager(db, {
                username: "unit-test"
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should success when create new data with useIncomeTax value is true", function(done) {
    Supplier.getNewData()
        .then(data => {
            data.unseIncomeTax = true;
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

it("#02. should success when create new data with useIncomeTax value is false", function(done) {
    Supplier.getNewData()
        .then(data => {
            data.unseIncomeTax = false;
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