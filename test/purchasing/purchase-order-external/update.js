require("should");
var helper = require("../../helper");

var purchaseOrderDataUtil = require("../../data-util/purchasing/purchase-order-data-util");
var validatePR = require("dl-models").validator.purchasing.purchaseOrder;
var purchaseOrders;
var purchaseOrderExternalDataUtil = require("../../data-util/purchasing/purchase-order-external-data-util");
var validatePO = require("dl-models").validator.purchasing.purchaseOrderExternal;
var PurchaseOrderExternalManager = require("../../../src/managers/purchasing/purchase-order-external-manager");
var purchaseOrderExternalManager = null;
var purchaseOrderExternal = {};

before('#00. connect db', function (done) {
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

it('#02. should success when update purchase-order-external', function (done) {
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