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
it('#01-1. should success when create new data with items', function(done) {
    dataUtil.getNewTestData()
        .then(book => {
            booking = book;
            validate(booking);
            done();
            // console.log(booking._id);
            
        })
        .catch(e => {
            done(e);
        });
});

var bookingEmptyItems;
it('#01-2. should success when create new data with no items', function(done) {
    dataUtil.getNewTestDataEmptyItems()
        .then(book => {
            bookingEmptyItems = book;
            validate(bookingEmptyItems);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02-1. should success when cancel for data with items', function(done) {
    manager.cancelBooking(booking)
        .then(booking => {
            manager.getSingleById(booking)
                .then(book => {
                    booking = book;
                    validate(booking);
                    booking.orderQuantity.should.equal(booking.items.reduce((total, value) => total + value.quantity, 0), "booking.orderQuantity invalid value");
                    if (booking.canceledBookingOrder) // remove after exist in models
                        booking.canceledBookingOrder.should.equal(booking.orderQuantity - booking.items.reduce((total, value) => total + value.quantity, 0), "booking.canceledBookingOrder invalid value");
                    if (booking.canceledDate) // remove after exist in models
                        booking.canceledDate.should.instanceof(Date);
                    booking.isCanceled.should.equal(false, "booking-order.isCanceled should be true after canceled");
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

it('#02-2. should success when cancel for data with no items', function(done) {
    manager.cancelBooking(bookingEmptyItems)
        .then(booking => {
            manager.getSingleById(booking)
                .then(book => {
                    booking = book;
                    validate(booking);
                    booking.orderQuantity.should.equal(0, "booking.orderQuantity invalid value");
                    if (booking.canceledBookingOrder) // remove after exist in models
                        booking.canceledBookingOrder.should.equal(bookingEmptyItems.orderQuantity, "booking.canceledBookingOrder invalid value");
                    if (booking.canceledDate) // remove after exist in models
                        booking.canceledDate.should.instanceof(Date);
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

