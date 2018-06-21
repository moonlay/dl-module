var helper = require("../../helper");
var dataUtil = require("../../data-util/master/garment-supplier-data-util");
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

var createdData;
var createdId;
it(`#01. should success when get created new data`, function (done) {
    dataUtil.getNewData()
    .then((data) => createdData=data)
            .then((data) => instanceManager.create(data))
            .then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
            })
            .catch((e) => {
                done(e);
            });
});

it(`#02. should success when destroy data with id`, function(done) {
    instanceManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#03. should null when get destroyed data`, function(done) {
    instanceManager.getSingleByIdOrDefault(createdId)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should success when create new data with useIncomeTax value is false", function(done) {
    dataUtil.getNewData()
        .then(data => {
            data.useIncomeTax = false;
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

it("#05. should success when create new data with useIncomeTax value is true", function(done) {
    dataUtil.getNewData()
        .then(data => {
            data.useIncomeTax = true;
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