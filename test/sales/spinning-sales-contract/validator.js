require("should");
var SpinningSalesContractDataUtil =  require("../../data-util/sales/spinning-sales-contract-data-util");
var helper = require("../../helper");
var validate =require("dl-models").validator.sales.spinningSalesContract;
var moment = require('moment');

var SpinningSalesContractManager = require("../../../src/managers/sales/spinning-sales-contract-manager");
var spinningSalesContractManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            spinningSalesContractManager = new SpinningSalesContractManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should error when create with empty data ', function (done) {
    spinningSalesContractManager.create({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                e.errors.should.have.property('buyer');
                e.errors.should.have.property('uom');
                e.errors.should.have.property('quality');
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it('#02. should error when create new data with deliverySchedule less than today', function (done) {
    SpinningSalesContractDataUtil.getNewData()
        .then(me => {
            var dateYesterday = new Date().setDate(new Date().getDate() -1);
            
            me.deliverySchedule = moment(dateYesterday).format('YYYY-MM-DD');

            spinningSalesContractManager.create(me)
                .then(id => {
                    done("should error when create new data with deliverySchedule less than today");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('deliverySchedule');
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

it('#03. should error when create new data with shippingQuantityTolerance more than 100', function (done) {
    SpinningSalesContractDataUtil.getNewData()
        .then(sc => {

            sc.shippingQuantityTolerance = 120;

            spinningSalesContractManager.create(sc)
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

it('#04. should error when create new data with non existent quality, comodity, buyer, accountBank,uom', function (done) {
    SpinningSalesContractDataUtil.getNewData()
        .then(sc => {

            sc.quality._id = '';
            sc.comodity._id = '';
            sc.buyer._id = '';
            sc.accountBank._id = '';
            sc.uom.unit = '';

            spinningSalesContractManager.create(sc)
                .then(id => {
                    done("should error when create new data with non existent quality, comodity, buyer, accountBank, uom");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('quality');
                        e.errors.should.have.property('comodity');
                        e.errors.should.have.property('buyer');
                        e.errors.should.have.property('accountBank');
                        e.errors.should.have.property('uom');
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