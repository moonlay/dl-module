'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/booking-order-manager");
var manager = null;
var dataUtil =require("../../data-util/garment-master-plan/booking-order-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.bookingOrder;


var ManagerPlan = require("../../../src/managers/garment-master-plan/sewing-blocking-plan-manager");
var managerPlan = null;
var dataUtilPlan =require("../../data-util/garment-master-plan/sewing-blocking-plan-data-util");
var validatePlan = require("dl-models").validator.garmentMasterPlan.masterPlan;

var moment = require('moment');

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'unit-test'
            });

            managerPlan = new ManagerPlan(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;
it("#01. should success when create new data", function (done) {
    dataUtil.getNewData()
        .then((data) => manager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});


var createdData;
it(`#02. should success when get created data with id`, function (done) {
    manager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            validate(data);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});


// it("#02.5 should success when create new data masterPlan", function (done) {
//     dataUtilPlan.getNewData()
//         .then((data) => {
//             data.bookingOrderId = createdId;
//             manager.create(data)
//             .then((id) => {
//                 id.should.be.Object();
//                 done();
//             })
//             .catch((e) => {
//                 done(e);
//             });
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

it("#03. should error when confirm created data without data items", function (done) {
    createdData.type='confirm';
    createdData.items = [{
        quantity: 0,
        deliveryDate : ''
    }];
        manager.update(createdData)
            .then((id) => {
                    done("should error when confirm created data without data items");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("items");
                    done();
                });
});

//item.deliveryDate>data.deliveryDate
it("#04. should error when confirm created data with deliveryDate items more than deliveryDate", function (done) {
    createdData.type='confirm';
    var today=new Date();
    //createdData.deliveryDate=new Date(today.setDate(today.getDate() + 10));
    var date=new Date(createdData.deliveryDate);
    createdData.items[0].deliveryDate=new Date(date.setDate(date.getDate() + 10));
        manager.update(createdData)
            .then((id) => {
                    done("should error when confirm created data with deliveryDate items more than deliveryDate");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("items");
                    done();
                });
});

it("#05. should error when confirm created data with deliveryDate items less than today", function (done) {
    createdData.type='confirm';
    var today=new Date();
    createdData.items[0].deliveryDate=new Date(today.setDate(today.getDate() - 10));
        manager.update(createdData)
            .then((id) => {
                    done("should error when confirm created data with deliveryDate items less than today");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("items");
                    done();
                });
});

// it("#06. should error when confirm created data with quantity items more than orderQuantity", function (done) {
//     createdData.type='confirm';
//     createdData.items[0].quantity=10000;
//         manager.update(createdData)
//             .then((id) => {
//                     done("should error when confirm created data with quantity items more than orderQuantity");
//                 })
//                 .catch((e) => {
//                     e.name.should.equal("ValidationError");
//                     e.should.have.property("errors");
//                     e.errors.should.instanceof(Object);
//                     e.errors.should.have.property("items");
//                     done();
//                 });
// });

it("#06. should error when confirm created data with deliveryDate items less than booking date", function (done) {
    createdData.type='confirm';
    //var today=new Date(createdData.bookingDate);
    var date=new Date(createdData.bookingDate.setDate(createdData.bookingDate.getDate() + 10));
    createdData.items[0].deliveryDate=new Date(date.setDate(date.getDate() - 10));
        manager.update(createdData)
            .then((id) => {
                    done("should error when confirm created data with deliveryDate items less than booking date");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("items");
                    done();
                });
});

it("#07. should error when confirm data with deliveryDate item is null", function (done){
    createdData.type='confirm';
    var date=new Date();
    createdData.items[0].deliveryDate=null;          
    manager.update(createdData)
        .then((id) => {
            done("should error when confirm data with deliveryDate item is null");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property("items");
            done();
            });
});

// it("#08. should error when confirm created data without data items", function (done) {
//     createdData.type='confirm';
//     createdData.items = [];
//         manager.update(createdData)
//             .then((id) => {
//                     done("should error when confirm created data without data items");
//                 })
//                 .catch((e) => {
//                     e.name.should.equal("ValidationError");
//                     e.should.have.property("errors");
//                     e.errors.should.instanceof(Object);
//                     e.errors.should.have.property("detail");
//                     done();
//                 });
// });

it("#09. should success when search data with filter", function (done) {
    manager.read({
        keyword: createdData.garmentBuyerName
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