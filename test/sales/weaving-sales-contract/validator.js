require("should");
var WeavingSalesContractDataUtil =  require("../../data-util/sales/weaving-sales-contract-data-util");
var helper = require("../../helper");
var validate =require("dl-models").validator.sales.weavingSalesContract;
var moment = require('moment');

var WeavingSalesContractManager = require("../../../src/managers/sales/weaving-sales-contract-manager");
var weavingSalesContractManager = null;

var buyerDataUtil = require("../../data-util/master/buyer-data-util");
var BuyerManager= require("../../../src/managers/master/buyer-manager");
var buyerManager;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            weavingSalesContractManager = new WeavingSalesContractManager(db, {
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

// it('#02. should error when create new data with deliverySchedule less than today', function (done) {
//     WeavingSalesContractDataUtil.getNewData()
//         .then(me => {
//             var dateYesterday = new Date().setDate(new Date().getDate() -1);
            
//             me.deliverySchedule = moment(dateYesterday).format('YYYY-MM-DD');

//             weavingSalesContractManager.create(me)
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

it('#03. should error when create new data with non existent quality, comodity, buyer, accountBank, uom, materialConstruction, yarnMaterial', function (done) {
    WeavingSalesContractDataUtil.getNewData()
        .then(sc => {

            sc.quality._id = '';
            sc.comodity._id = '';
            sc.buyer._id = '';
            sc.accountBank._id = '';
            sc.materialConstruction._id = '';
            sc.yarnMaterial._id = '';
            sc.uom.unit = '';

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

var createdDataBuyer;
var createdDataBuyerId;
it("#04. should success when create new data export buyer", function(done) {
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

it("#06. should success when search data with filter", function (done) {
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

it('#07. it should error when create new data with export buyer with agent without comission, term of shipment', function (done) {
    WeavingSalesContractDataUtil.getNewData()
        .then(sc => {

            sc.buyer = createdDataBuyer;
            sc.buyer._id = createdDataBuyerId;
            sc.comission = '';
            sc.termOfShipment = '';

            weavingSalesContractManager.create(sc)
                .then(id => {
                    done("should error when create new data with export buyer with agent without comission, term of shipment");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('comission');
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