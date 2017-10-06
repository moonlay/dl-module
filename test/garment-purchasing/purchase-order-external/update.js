require("should");
var helper = require("../../helper");

var purchaseOrderDataUtil = require("../../data-util/garment-purchasing/purchase-order-data-util");
var purchaseOrders;
var purchaseOrders2;
var purchaseOrderExternalDataUtil = require("../../data-util/garment-purchasing/purchase-order-external-data-util");
var validatePO = require("dl-models").validator.garmentPurchasing.garmentPurchaseOrderExternal;
var PurchaseOrderExternalManager = require("../../../src/managers/garment-purchasing/purchase-order-external-manager");
var purchaseOrderExternalManager = null;
var purchaseOrderExternal = {};
before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, {
                username: 'unit-test'
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

            var get2newPurchaseOrder2 = new Promise((resolve, reject) => {
                purchaseOrderDataUtil.getNewTestData()
                    .then(po1 => {
                        purchaseOrderDataUtil.getNewTestData()
                            .then(po2 => {
                                resolve([po1, po2])
                            })
                    })
            })

            Promise.all([get2newPurchaseOrder, get2newPurchaseOrder2])
                .then(results => {
                    purchaseOrders = results[0];
                    purchaseOrders2 = results[1];
                    done()
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should success when create new purchase-order-external with purchase-orders', function (done) {
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

var purchaseOrderExternal2;
it('#01. (2) should success when create new purchase-order-external with purchase-orders', function (done) {
    purchaseOrderExternalDataUtil.getNew2(purchaseOrders2)
        .then(poe => {
            purchaseOrderExternal2 = poe;
            validatePO(purchaseOrderExternal2);
            done();
        })
        .catch(e => {
            done(e);
        });
});


it('#02. should success when generate pdf purchase-order-external fabric', function (done) {
    purchaseOrderExternalManager.pdf(purchaseOrderExternal._id, 7)
        .then(results => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#03. should success when update purchase-order-external', function (done) {
    purchaseOrderExternal.category = "ACCESSORIES";
    purchaseOrderExternalManager.update(purchaseOrderExternal)
        .then((id) => {
            return purchaseOrderExternalManager.getSingleById(id);
        })
        .then(po => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#04. should success when generate pdf purchase-order-external non fabric', function (done) {
    purchaseOrderExternalManager.pdf(purchaseOrderExternal._id, 7)
        .then(results => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#04.(2) should success when generate pdf purchase-order-external english ver', function (done) {
    purchaseOrderExternalManager.pdf(purchaseOrderExternal2._id, 7)
        .then(results => {
            done();
        })
        .catch(e => {
            done(e);
        });
});


it('#05. should success when generate pdf purchase-order-external ver non fabric', function (done) {
    purchaseOrderExternal.category = "ACCESSORIES"
    purchaseOrderExternalManager.pdf(purchaseOrderExternal._id, 7)
        .then(results => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#06. should success when update purchase-order-external', function (done) {
    purchaseOrderExternal.items.splice(0, 1);
    purchaseOrderExternalManager.update(purchaseOrderExternal)
        .then((id) => {
            return purchaseOrderExternalManager.getSingleById(id);
        })
        .then(po => {
            done();
        })
        .catch(e => {
            done(e);
        });
});