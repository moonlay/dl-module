'use strict';

var should = require('should');
var helper = require("../../helper");
var DeliveryOrderManager = require("../../../src/managers/purchasing/delivery-order-manager");
var UnitPaymentQuantityCorrectionManager = require("../../../src/managers/purchasing/unit-payment-quantity-correction-note-manager");
var deliveryOrderManager = null;
var unitPaymentQuantityCorrectionManager = null;
var deliveryOrderDataUtil = require("../../data-util/purchasing/delivery-order-data-util");
var unitPaymentQuantityCorrectionDataUtil = require("../../data-util/purchasing/unit-payment-quantity-correction-note-data-util");
var validate = require("dl-models").validator.purchasing.deliveryOrder;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            deliveryOrderManager = new DeliveryOrderManager(db, {
                username: 'unit-test'
            });
            unitPaymentQuantityCorrectionManager = new UnitPaymentQuantityCorrectionManager(db, {
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
    deliveryOrderDataUtil.getNewData()
        .then((data) => deliveryOrderManager.create(data))
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
    deliveryOrderManager.getSingleById(createdId)
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

it(`#03. should success when delete data`, function (done) {
    deliveryOrderManager.delete(createdData)
        .then((id) => {
            id.toString().should.equal(createdId.toString());
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it(`#04. should _deleted=true`, function (done) {
    deliveryOrderManager.getSingleByQuery({
        _id: createdId
    })
        .then((data) => {
            validate(data);
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should success when create deleted data", function (done) {
    delete createdData._id;
    delete createdData.refNo;
    deliveryOrderManager.create(createdData)
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#06. should failed when create new delivery order with closed purchase order external', function (done) {
    deliveryOrderDataUtil.getNewTestDataPoExternalIsClosed()
        .then(po => {
            done("purchase order external cannot be used to create delivery-order due closed status");
        })
        .catch(e => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});

var correctionData;
it("#07. should success when create new data quantity correction", function (done) {
    unitPaymentQuantityCorrectionDataUtil.getNewTestData()
        .then((data) => {
            data.should.instanceof(Object);
            correctionData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var dataPurchaseOrderExternal;
it(`#08. should success when get created data with id`, function (done) {
    deliveryOrderManager.purchaseOrderExternalManager.getSingleById(correctionData.items[0].purchaseOrder.purchaseOrderExternal._id)
        .then((data) => {
            data.should.instanceof(Object);
            dataPurchaseOrderExternal = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#09. should success when create new data", function (done) {
    deliveryOrderDataUtil.getNewData(dataPurchaseOrderExternal)
        .then((data) => deliveryOrderManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#10. should success when get created data with id`, function (done) {
    deliveryOrderManager.getSingleById(createdId)
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

it(`#11. should success when update data`, function (done) {
    createdData.remark = "#test"
    deliveryOrderManager.update(createdData)
        .then((id) => {
            id.toString().should.equal(createdId.toString());
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#12. should success when search data with filter", function (done) {
    deliveryOrderManager.read({
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