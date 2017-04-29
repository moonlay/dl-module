require("should");
var dataUtil = require("../../data-util/sales/production-order-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.productionOrder;
var codeGenerator = require('../../../src/utils/code-generator');
var ProductionOrderManager= require("../../../src/managers/sales/production-order-manager");
var manager;

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


it('#02. should error when create new data with shippingQuantityTolerance more than 100', function (done) {
    dataUtil.getNewData()
        .then(sc => {

            sc.shippingQuantityTolerance = 120;

            manager.create(sc)
                .then(id => {
                    done("should error when create new data with shippingQuantityTolerance more than 100");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('shippingQuantityTolerance');
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch(e => {
            done(e);
        });
});

it('#03. should error when create new data with RUN but without RUNWidth', function (done) {
    dataUtil.getNewData()
        .then(sc => {

            sc.RUN = "1 RUN";
            sc.RUNWidth[0]=0;

            manager.create(sc)
                .then(id => {
                    done("should error when create new data with RUN but without RUNWidth");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('RUNWidth');
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch(e => {
            done(e);
        });
});