require("should");
var ProductionOrderDataUtil = require('../../data-util/sales/production-order-data-util');
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.productionOrder;

var ProductionOrderManager = require("../../../src/managers/sales/production-order-manager");
var productionOrderManager = null;

let database;
before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            database = db;
            productionOrderManager = new ProductionOrderManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should success when create new data', function (done) {
    ProductionOrderDataUtil.getNewTestData()
        .then((spp) => {
            validate(spp);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should error when create with duplicate Order Number', function (done) {
    ProductionOrderDataUtil.getNewData()
        .then(productionOrder => {
            var type = productionOrder && productionOrder.orderType && productionOrder.orderType.name && (productionOrder.orderType.name.toString().toLowerCase() === "printing") ? "P" : "F";
            var query = { "type": type, "description": "SPP Finishing Printing" };

            database.collection("document-numbers")
                .findOne(query, { "number": 1 })
                .then((previousDocumentNumber) => {
                    var documentNumbersData = {
                        "$set": {
                            number: previousDocumentNumber.number - 1
                        }
                    };

                    var options = { "upsert": true };

                    database.collection("document-numbers")
                        .updateOne(query, documentNumbersData, options)
                        .then((id) => {
                            productionOrderManager.create(productionOrder)
                                .then(response => {
                                    done("Should not be able to create with duplicate order number");
                                })
                                .catch(e => {
                                    try {
                                        e.name.should.equal("DuplicateError");
                                        e.should.have.property("errors");
                                        e.errors.should.be.String();
                                        done();
                                    }
                                    catch (ex) {
                                        done(e);
                                    }
                                });
                        });
                });
        });
});

it('#03. should error when create sync with empty data', function (done) {
    productionOrderManager.createSync([], 0)
        .then((spp) => {
            done("Should not be able to create with empty data");
        })
        .catch(e => {
            try {
                e.name.should.equal("UnknownError");
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});
