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

it('#03. should success when hapus sisa', function(done) {
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