require("should");
var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/booking-order-manager");
var manager = null;
var dataUtil =require("../../data-util/garment-master-plan/booking-order-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.bookingOrder;

var moment = require('moment');

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var booking;
it('#01. should success when create new data', function(done) {
    dataUtil.getNewTestData()
        .then(book => {
            booking = book;
            validate(booking);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should success when cancel', function(done) {
    manager.cancelBooking(booking)
        .then(booking => {
            //var bookingId = booking._id;
            manager.getSingleById(booking)
                .then(book => {
                    booking = book;
                    validate(booking);
                    booking.isCanceled.should.equal(true, "booking-order.isCanceled should be true after canceled");
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
