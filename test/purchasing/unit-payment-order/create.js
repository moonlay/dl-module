var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitPaymentOrderManager = require("../../../src/managers/purchasing/unit-payment-order-manager");
var unitPaymentOrderManager = null;
var unitPaymentOrder = require("../../data-util/purchasing/unit-payment-order-data-util");

var DivisionManager = require("../../../src/managers/master/division-manager");
var divisionManager = null;
var division = require("../../data-util/master/division-data-util");

var generateCode = require("../../../src/utils/code-generator");

require("should");

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            unitPaymentOrderManager = new UnitPaymentOrderManager(db, {
                username: 'unit-test'
            });
            divisionManager = new DivisionManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;var createdData;
it('#01. should success when create new data', function (done) {
    unitPaymentOrder.getNewData()
        .then((data) => {
            createdData=data;
            unitPaymentOrderManager.create(data)
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

it('#02. should error when create new blank data', function (done) {
    unitPaymentOrderManager.create({})
        .then((id) => {
            id.should.be.Object();
            done();
        })
        .catch(e => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        })
});

it("#03. should success when search data with filter", function (done) {
    unitPaymentOrderManager.read({
        keyword: createdData.supplier.name
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

it("#04. should success when get expedition report data", function (done) {
    unitPaymentOrderManager.getExpeditionReport({
        filter: {
            no: createdData.no,
            supplierCode: createdData.supplier.code,
            divisionCode: createdData.division.code,
            status: 1,
            dateFrom: new Date(1995, 1, 23),
            dateTo: createdData.date,
        }
    }, 0)
        .then((documents) => {
            documents.should.have.property("data");
            documents.data.should.be.instanceof(Array);
            documents.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it('#05. should success when create new data', function (done) {
    unitPaymentOrder.getNewData()
        .then((data) => {
            data.division.name ="GARMENT";
            unitPaymentOrderManager.create(data)
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

it('#05. should success when create new data', function (done) {
    unitPaymentOrder.getNewData()
        .then((data) => {
            data.division.name ="UTILITY";
            unitPaymentOrderManager.create(data)
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
