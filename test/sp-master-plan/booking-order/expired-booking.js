require("should");
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

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'dev'
            });
            managerPlan = new ManagerPlan(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId;
it("#01. should success when create new data", function (done) {
    dataUtil.getNewData()
        .then((data) =>{ 
            data.orderQuantity=5000;
            manager.create(data)
            .then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
        })
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

var createdPlanId;
var createdPlan;
it("#03. should success when create new data blocking plan", function (done) {
    dataUtilPlan.getNewData()
        .then((data) =>{ 
            data.bookingOrderId=createdId;
            data.deliveryDate=createdData.deliveryDate;
            for(var detail of data.details){
                detail.deliveryDate=createdData.deliveryDate;
            }
            managerPlan.create(data)
            .then((id) => {
                id.should.be.Object();
                createdPlanId = id;
                done();
        })
        })
        .catch((e) => {
            done(e);
        });
});

it('#04. should success when hapus sisa', function(done) {
    manager.expiredBooking(createdData)
        .then(booking => {
            //var bookingId = booking._id;
            manager.getSingleById(booking)
                .then(book => {
                    var booking = book;
                    validate(booking);
                    booking.expiredBookingOrder.should.not.equal(0);
                    done();
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});