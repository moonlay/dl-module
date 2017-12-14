require("should");
var ProductionOrder = require('../../data-util/sales/production-order-data-util');
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.productionOrder;

var ProductionOrderManager = require("../../../src/managers/sales/production-order-manager");
var productionOrderManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            productionOrderManager = new ProductionOrderManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var productionOrder;
it('#01. should success when create new data', function (done) {
    ProductionOrder.getNewTestData()
        .then((spp) => {
            productionOrder = spp;
            validate(productionOrder);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should success when close', function (done) {
    productionOrderManager.close([productionOrder])
        .then(productionOrders => {
            var sppId = productionOrders[0];
            productionOrderManager.getSingleById(sppId)
                .then((spp) => {
                    productionOrder = spp;
                    validate(productionOrder);
                    productionOrder.isClosed.should.equal(true, "production-order.isClosed should be true after posted");
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});
