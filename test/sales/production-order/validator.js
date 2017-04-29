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

it('#04. it should error when create new data with different total quantity', function (done) {
    dataUtil.getNewData()
        .then(sc => {
            sc.orderQuantity=100;
            sc.detail = [{
                        code:`code1/${codeGenerator()}`,
                        colorTypeId:color1._id,
                        colorType:color1,
                        colorRequest:`reddish`,
                        colorTemplate:`template1`,
                        quantity:10,
                        uomId: _uom._id,
                        uom:_uom,
                    }, {
                        code:`code2/${codeGenerator()}`,
                        colorTypeId:color2._id,
                        colorType:color2,
                        colorRequest:`gray`,
                        colorTemplate:`template2`,
                        quantity:5,
                        uomId: _uom._id,
                        uom:_uom,
                    }];

            manager.create(sc)
                .then(id => {
                    done("should error when create new data without detail");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('details');
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