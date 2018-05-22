require("should");
var helper = require("../../helper");

var purchaseOrderDataUtil = require("../../data-util/purchasing/purchase-order-data-util");
var validatePR = require("dl-models").validator.purchasing.purchaseOrder;
var PurchaseOrderManager = require("../../../src/managers/purchasing/purchase-order-manager");
var purchaseOrderManager = null;
var purchaseOrders;

var purchaseOrderExternalDataUtil = require("../../data-util/purchasing/purchase-order-external-data-util");
var validatePO = require("dl-models").validator.purchasing.purchaseOrderExternal;
var PurchaseOrderExternalManager = require("../../../src/managers/purchasing/purchase-order-external-manager");
var purchaseOrderExternalManager = null;
var purchaseOrderExternal;

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            purchaseOrderManager = new PurchaseOrderManager(db, {
                username: 'dev'
            });
            purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, {
                username: 'dev'
            });

            var get2newPurchaseOrder = new Promise((resolve, reject) => {
                purchaseOrderDataUtil.getNewTestData()
                    .then(po1 => {
                        purchaseOrderDataUtil.getNewTestData()
                            .then(po2 => {
                                resolve([po1, po2])
                            })
                    })
            })

            Promise.all([get2newPurchaseOrder])
                .then(results => {
                    purchaseOrders = results[0];
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

it('#01. should success when create new purchase-order-external with purchase-orders', function(done) {
    purchaseOrderExternalDataUtil.getNew(purchaseOrders)
        .then(poe => {
            purchaseOrderExternal = poe;
            validatePO(purchaseOrderExternal);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. purchase-orders supplier & currency should be the same with one in purchase-order-external', function(done) {
    Promise.all(purchaseOrders.map(purchaseOrder => {
            return purchaseOrderManager.getSingleById(purchaseOrder._id);
        }))
        .then(results => {
            purchaseOrders = results;
            purchaseOrderExternal.items.length.should.equal(purchaseOrders.length, "purchase-order-external items not the same count with purchase-orders");

            for (var purchaseOrder of purchaseOrders) {
                purchaseOrder.isPosted.should.equal(true);
                // purchaseOrder.supplierId.toString().should.equal(purchaseOrderExternal.supplierId.toString(), "supplierId have different value");
            }
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#03. should success when posting purchase-order-external', function(done) {
    purchaseOrderExternalManager.post([purchaseOrderExternal])
        .then(ids => {
            purchaseOrderExternalManager.getSingleById(ids[0])
                .then(poe => {
                    purchaseOrderExternal = poe;
                    purchaseOrderExternal.isPosted.should.equal(true);
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

it('#04. purchase-orders supplier & currency should be the same with one in purchase-order-external', function(done) {
    Promise.all(purchaseOrders.map(purchaseOrder => {
            return purchaseOrderManager.getSingleById(purchaseOrder._id);
        }))
        .then(results => {
            purchaseOrders = results;
            purchaseOrderExternal.items.length.should.equal(purchaseOrders.length, "purchase-order-external items not the same count with purchase-orders");

            for (var purchaseOrder of purchaseOrders) {
                purchaseOrder.isPosted.should.equal(true);
                purchaseOrder.supplierId.toString().should.equal(purchaseOrderExternal.supplierId.toString(), "supplierId have different value");
            }
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#03. should success when search data with filter", function (done) {
    purchaseOrderExternalManager.read({
        keyword: purchaseOrderExternal.supplier.name
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