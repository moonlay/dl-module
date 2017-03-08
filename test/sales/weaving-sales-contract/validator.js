require("should");
var WeavingSalesContractDataUtil =  require("../../data-util/sales/weaving-sales-contract-data-util");
var helper = require("../../helper");
var validate =require("dl-models").validator.sales.weavingSalesContract;
var moment = require('moment');

var WeavingSalesContractManager = require("../../../src/managers/sales/weaving-sales-contract-manager");
var weavingSalesContractManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            weavingSalesContractManager = new WeavingSalesContractManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should error when create with empty data ', function (done) {
    weavingSalesContractManager.create({})
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
    WeavingSalesContractDataUtil.getNewData()
        .then(me => {
            var dateYesterday = new Date().setDate(new Date().getDate() -1);
            
            me.deliverySchedule = moment(dateYesterday).format('YYYY-MM-DD');

            weavingSalesContractManager.create(me)
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
    WeavingSalesContractDataUtil.getNewData()
        .then(sc => {

            sc.shippingQuantityTolerance = 120;

            weavingSalesContractManager.create(sc)
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

it('#04. should error when create new data with non existent quality, comodity, buyer, accountBank, uom, materialConstruction, yarnMaterial', function (done) {
    WeavingSalesContractDataUtil.getNewData()
        .then(sc => {

            sc.qualityId = 'randomId';
            sc.comodityId = 'randomId';
            sc.buyerId = 'randomId';
            sc.accountBankId = 'randomId';
            sc.materialConstructionId = 'randomId';
            sc.yarnMaterialId = 'randomId';

            weavingSalesContractManager.create(sc)
                .then(id => {
                    done("should error when create new data with non existent quality, comodity, buyer, accountBank, uom, materialConstruction, yarnMaterial");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('quality');
                        e.errors.should.have.property('comodity');
                        e.errors.should.have.property('buyer');
                        e.errors.should.have.property('accountBank');
                        e.errors.should.have.property('materialConstruction');
                        e.errors.should.have.property('yarnMaterial');
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