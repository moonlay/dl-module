require("should");
var FinishingPrintingSalesContractDataUtil =  require("../../data-util/sales/finishing-printing-sales-contract-data-util");
var helper = require("../../helper");
var validate =require("dl-models").validator.sales.finishingPrintingSalesContract;
var moment = require('moment');

var FinishingPrintingSalesContractManager = require("../../../src/managers/sales/finishing-printing-sales-contract-manager");
var finishingPrintingSalesContractManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            finishingPrintingSalesContractManager = new FinishingPrintingSalesContractManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should error when create with empty data ', function (done) {
    finishingPrintingSalesContractManager.create({})
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
    FinishingPrintingSalesContractDataUtil.getNewData()
        .then(me => {
            var dateYesterday = new Date().setDate(new Date().getDate() -1);
            
            me.deliverySchedule = moment(dateYesterday).format('YYYY-MM-DD');

            finishingPrintingSalesContractManager.create(me)
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
    FinishingPrintingSalesContractDataUtil.getNewData()
        .then(sc => {

            sc.shippingQuantityTolerance = 120;

            finishingPrintingSalesContractManager.create(sc)
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
    FinishingPrintingSalesContractDataUtil.getNewData()
        .then(sc => {

            sc.qualityId = 'randomId';
            sc.comodityId = 'randomId';
            sc.buyerId = 'randomId';
            sc.accountBankId = 'randomId';
            sc.materialConstructionId = 'randomId';
            sc.yarnMaterialId = 'randomId';

            finishingPrintingSalesContractManager.create(sc)
                .then(id => {
                    done("should error when create new data with non existent quality, comodity, buyer, accountBank, uom, materialConstruction, yarnMaterial");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('quality');
                        e.errors.should.have.property('comodity');
                        e.errors.should.have.property('buyer');
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