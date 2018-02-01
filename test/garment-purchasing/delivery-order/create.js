'use strict';

var should = require('should');
var helper = require("../../helper");
var DeliveryOrderManager = require("../../../src/managers/garment-purchasing/delivery-order-manager");
var PurchaseQuantityCorrectionManager = require("../../../src/managers/garment-purchasing/purchase-quantity-correction-manager");
var deliveryOrderManager = null;
var purchaseQuantityCorrectionManager = null;
var deliveryOrderDataUtil = require("../../data-util/garment-purchasing/delivery-order-data-util");
var purchaseQuantityCorrectionDataUtil = require("../../data-util/garment-purchasing/purchase-price-correction-data-util");
var validate = require("dl-models").validator.garmentPurchasing.garmentDeliveryOrder;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            deliveryOrderManager = new DeliveryOrderManager(db, {
                username: 'unit-test'
            });
            purchaseQuantityCorrectionManager = new PurchaseQuantityCorrectionManager(db, {
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

it(`#03. should success when update data`, function (done) {
    createdData.remark = "#test"
    deliveryOrderManager.updateCollectionDeliveryOrder(createdData)
        .then((id) => {
            id.toString().should.equal(createdId.toString());
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#04. should success when delete data`, function (done) {
    deliveryOrderManager.delete(createdData)
        .then((id) => {
            id.toString().should.equal(createdId.toString());
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it(`#05. should _deleted=true`, function (done) {
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

it("#06. should success when create deleted data", function (done) {
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

it('#07. should failed when create new delivery order with closed purchase order external', function (done) {
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

var sampleData = {};
it('#08. should error when create new delivery order with invalid conversion value', function (done) {
    deliveryOrderDataUtil.getNewData()
        .then((data) => {
            sampleData = Object.assign({}, data);
            for (var item of data.items) {
                for (var fulfillment of item.fulfillments) {
                    fulfillment.quantityConversion = 0;
                    fulfillment.uomConversion = {};
                }
            }
            deliveryOrderManager.create(data)
                .then(po => {
                    done("invalid conversion value cannot be used to create delivery-order");
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
        })
});

it('#09. should error when create new delivery order with invalid conversion value', function (done) {
    for (var item of sampleData.items) {
        for (var fulfillment of item.fulfillments) {
            fulfillment.conversion = 2;
        }
    }
    deliveryOrderManager.create(sampleData)
        .then(po => {
            done("invalid conversion value cannot be used to create delivery-order");
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
it("#10. should success when create new data quantity correction", function (done) {
    purchaseQuantityCorrectionDataUtil.getNewTestData()
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
it(`#11. should success when get created data with id`, function (done) {
    deliveryOrderManager.purchaseOrderExternalManager.getSingleById(correctionData.items[0].purchaseOrderExternalId)
        .then((data) => {
            data.should.instanceof(Object);
            dataPurchaseOrderExternal = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#12. should success when create new data", function (done) {
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

it(`#13. should success when get created data with id`, function (done) {
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

it(`#14. should success when update data`, function (done) {
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

it("#15. should success when read data", function (done) {
    deliveryOrderManager.read({ "keyword": "test" })
        .then((data) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});