require("should");
var dataUtil = require("../../data-util/sales/production-order-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.salesContract;

var ProductionOrderManager = require("../../../src/managers/sales/production-order-manager");
var productionOrderManager = null;

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            manager = new ProductionOrderManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should error when create with empty data", function(done) {
        manager.create({})
            .then((id) => {
                done("Should not be able to create with empty data");
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

var createdId;
var dataprodOrder;
    it("#02. should success when create new data", function(done) {
        dataUtil.getNewData()
            //.then((data) => dataprodOrder=data)
            .then((data) =>{
                dataprodOrder=data;
                manager.create(data)
                .then((id) => {
                    id.should.be.Object();
                    createdId = id;
                    done();
                })
                .catch((e) => {
                    done(e);
                });
            });
    });

    var createdData;
    it(`#03. should success when get created data with id`, function(done) {
        manager.getSingleById(createdId)
            .then((data) => {
                data.should.instanceof(Object);
                validate(data);
                createdData = data;
                done();
            })
            .catch((e) => {
                done(e);
            });
    });

    it(`#04. should success when update created data`, function(done) {
        manager.update(dataprodOrder)
            .then((id) => {
                createdId.toString().should.equal(id.toString());
                done();
            })
            .catch((e) => {
                done(e);
            });
    });

    it("#05. should success when read data", function(done) {
        manager.read({
                filter: {
                    _id: createdId
                }
            })
            .then((documents) => {
                //process documents
                documents.should.have.property("data");
                documents.data.should.be.instanceof(Array);
                documents.data.length.should.not.equal(0);
                done();
            })
            .catch((e) => {
                done(e);
            });
    });

    it(`#09. should success when delete data`, function(done) {
        manager.delete(dataprodOrder)
            .then((id) => {
                id.toString().should.equal(createdId.toString());
                done();
            })
            .catch((e) => {
                done(e);
            });
    });