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
            purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, {
                username: 'dev'
            });

            Promise.all([purchaseOrderDataUtil.getNewTestData(), purchaseOrderDataUtil.getNewTestData()])
                .then(results => {
                    purchaseOrders = results;
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
    purchaseOrderExternal.items.splice(0,1);
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