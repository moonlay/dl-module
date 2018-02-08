'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/booking-order-manager");
var manager = null;
var dataUtil =require("../../data-util/garment-master-plan/booking-order-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.bookingOrder;

var moment = require('moment');

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it("#01. should error when create new data with empty data", function (done) {
    manager.create({})
        .then((id) => {
            done("should error when create new data with empty data");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            done();
        });
});

// it("#02. should error when create new data with no items", function (done) {
//     dataUtil.getNewData()
//         .then((data) => {
//             data.items = [];
//             manager.create(data)
//                 .then((id) => {
//                     done("should error when create new data with no items");
//                 })
//                 .catch((e) => {
//                     e.name.should.equal("ValidationError");
//                     e.should.have.property("errors");
//                     e.errors.should.instanceof(Object);
//                     e.errors.should.have.property("items");
//                     done();
//                 });
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

it("#02. should error when create new data with deliveryDate is null", function (done){
    dataUtil.getNewData()
        .then((data) => {
            var targetDate=new Date();
            data.deliveryDate=null;
            data.bookingDate=new Date();
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with deliveryDate is null");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("deliveryDate");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success when create new data with deliveryDate > bookingDate", function (done){
    dataUtil.getNewData()
        .then((data) => {
            var targetDate=new Date();
            data.deliveryDate=new Date(targetDate.setDate(targetDate.getDate() + 10))
            data.bookingDate=new Date();
            manager.create(data)
                .then((id) => {
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

it("#04. should error when create new data with deliveryDate < bookingDate ", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            var targetDate=new Date();
            data.deliveryDate=new Date(targetDate.setDate(targetDate.getDate() - 10));
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with deliveryDate < bookingDate");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("deliveryDate");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should error when create new data with deliveryDate < today ", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            var targetDate=new Date();
            data.deliveryDate=new Date(targetDate.setDate(targetDate.getDate() - 5));
            data.bookingDate=new Date();
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with deliveryDate < today");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("deliveryDate");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should error when create new data with orderQuantity is null", function (done){
    dataUtil.getNewData()
        .then((data) => {
            data.orderQuantity=null;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with orderQuantity is null");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("deliveryDate");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

var newData;
var createdId;
it("#06. should success when create new data", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            newData = data;
            manager.create(data)
                .then((id) => {
                    createdId = id;
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

it("#07. should success when search data with filter", function (done) {
    manager.read({
        keyword: newData.garmentBuyerName
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

it("#08. should success when destroy data with id", function (done) {
    manager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

// it("#04. should error when create new data with orderQuantity not equal total quantity in items", function (done) {
//     dataUtil.getNewData()
//         .then((data) => {
//             data.orderQuantity=2000;
//             manager.create(data)
//                 .then((id) => {
//                     done("should error when create new data with date greater than today");
//                 })
//                 .catch((e) => {
//                     e.name.should.equal("ValidationError");
//                     e.should.have.property("errors");
//                     e.errors.should.instanceof(Object);
//                     e.errors.should.have.property("orderQuantity");
//                     done();
//                 });
//         })
//         .catch((e) => {
//             done(e);
//         });
// });
