require("should");
var FinishingPrintingSalesContractDataUtil = require("../../data-util/sales/finishing-printing-sales-contract-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.finishingPrintingSalesContract;
var moment = require('moment');

var FinishingPrintingSalesContractManager = require("../../../src/managers/sales/finishing-printing-sales-contract-manager");
var finishingPrintingSalesContractManager = null;

var buyerDataUtil = require("../../data-util/master/buyer-data-util");
var BuyerManager = require("../../../src/managers/master/buyer-manager");
var buyerManager;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            finishingPrintingSalesContractManager = new FinishingPrintingSalesContractManager(db, {
                username: 'dev'
            });

            buyerManager = new BuyerManager(db, {
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

// it('#02. should error when create new data with deliverySchedule less than today', function (done) {
//     FinishingPrintingSalesContractDataUtil.getNewData()
//         .then(me => {
//             var dateYesterday = new Date().setDate(new Date().getDate() -1);

//             me.deliverySchedule = moment(dateYesterday).format('YYYY-MM-DD');

//             finishingPrintingSalesContractManager.create(me)
//                 .then(id => {
//                     done("should error when create new data with deliverySchedule less than today");
//                 })
//                 .catch(e => {
//                     try {
//                         e.errors.should.have.property('deliverySchedule');
//                         done();
//                     }
//                     catch (ex) {
//                         done(ex);
//                     }
//                 });
//         })
//         .catch(e => {
//             done(e);
//         });
// });

it('#02. should error when create new data with shippingQuantityTolerance more than 100', function (done) {
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

it('#03. should error when create new data with non existent quality, comodity, buyer, accountBank, uom, materialConstruction, yarnMaterial, orderType', function (done) {
    FinishingPrintingSalesContractDataUtil.getNewData()
        .then(sc => {

            sc.qualityId = '';
            sc.comodityId = '';
            sc.buyerId = '';
            sc.accountBankId = '';
            sc.materialConstructionId = '';
            sc.yarnMaterialId = '';
            sc.uom.unit = '';
            sc.orderTypeId = '';

            finishingPrintingSalesContractManager.create(sc)
                .then(id => {
                    done("should error when create new data with non existent quality, comodity, buyer, accountBank, uom, materialConstruction, yarnMaterial, orderType");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('quality');
                        e.errors.should.have.property('comodity');
                        e.errors.should.have.property('buyer');
                        e.errors.should.have.property('materialConstruction');
                        e.errors.should.have.property('yarnMaterial');
                        e.errors.should.have.property('uom');
                        e.errors.should.have.property('orderType');
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

var createdDataBuyer;
var createdDataBuyerId;
it("#04. should success when create new data export buyer", function (done) {
    buyerDataUtil.getNewData()
        .then((data) => {
            data.type = "Ekspor";
            createdDataBuyer = data;
            buyerManager.create(data)
                .then((id) => {
                    id.should.be.Object();
                    createdDataBuyerId = id;
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });
});

it("#05. should success when search data with filter", function (done) {
    buyerManager.read({
        keyword: createdDataBuyer.buyer
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

it('#06. it should error when create new data with export buyer with agent without comission, amount, term of shipment', function (done) {
    FinishingPrintingSalesContractDataUtil.getNewData()
        .then(sc => {

            sc.buyer = createdDataBuyer;
            sc.buyerId = createdDataBuyer._id;
            sc.comission = '';
            sc.amount = 0;
            sc.termOfShipment = '';

            finishingPrintingSalesContractManager.create(sc)
                .then(id => {
                    done("should error when create new data with export buyer with agent without comission, amount, term of shipment");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('comission');
                        e.errors.should.have.property('amount');
                        e.errors.should.have.property('termOfShipment');
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

it('#07. it should error when create new data with poitSystem=4 and pointLimit=0', function (done) {
    FinishingPrintingSalesContractDataUtil.getNewData()
        .then(sc => {
            sc.pointSystem = 4;
            sc.pointLimit = 0;

            finishingPrintingSalesContractManager.create(sc)
                .then(id => {
                    done("should error when create new data with poitSystem=4 and pointLimit=0");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('pointLimit');
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

it('#08. it should error when create new data without detail', function (done) {
    FinishingPrintingSalesContractDataUtil.getNewData()
        .then(sc => {
            sc.details = [{
                color: '',
                price: 0,
                useIncomeTax: true
            }];

            finishingPrintingSalesContractManager.create(sc)
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