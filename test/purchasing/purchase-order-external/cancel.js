require("should");
var helper = require("../../helper");

var purchaseOrderDataUtil = require("../../data-util/purchasing/purchase-order-data-util");
var validatePR = require("dl-models").validator.purchasing.purchaseOrder;
var PurchaseOrderManager = require("../../../src/managers/purchasing/purchase-order-manager");
var purchaseOrderManager = null;
var purchaseOrders;

var PurchaseRequestManager = require("../../../src/managers/purchasing/purchase-request-manager");
var purchaseRequestManager = null;
var purchaseRequests;

var purchaseOrderExternalDataUtil = require("../../data-util/purchasing/purchase-order-external-data-util");
var validatePO = require("dl-models").validator.purchasing.purchaseOrderExternal;
var PurchaseOrderExternalManager = require("../../../src/managers/purchasing/purchase-order-external-manager");
var purchaseOrderExternalManager = null;
var purchaseOrderExternal;

var poStatusEnum = require("dl-models").purchasing.enum.PurchaseOrderStatus;
var prStatusEnum = require("dl-models").purchasing.enum.PurchaseRequestStatus;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseOrderManager = new PurchaseOrderManager(db, {
                username: 'dev'
            });
            purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, {
                username: 'dev'
            });
            purchaseRequestManager = new PurchaseRequestManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should success when create new posted purchase-order-external with purchase-orders', function (done) {
    purchaseOrderExternalDataUtil.getPosted()
        .then(poe => {
            purchaseOrderExternal = poe;
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should isPosted = true', function (done) {
    purchaseOrderExternalManager.getSingleByQuery({ _id: purchaseOrderExternal._id })
        .then((data) => {
            data.isPosted.should.be.Boolean();
            data.isPosted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#03. should success when canceling purchase-order-external', function (done) {
    purchaseOrderExternalManager.cancel(purchaseOrderExternal._id)
        .then((poExId) => {
            purchaseOrderExternalManager.getSingleById(poExId)
                .then((poe) => {
                    purchaseOrderExternal = poe;
                    JSON.stringify(purchaseOrderExternal.status).should.equal(JSON.stringify(poStatusEnum.VOID));
                    done();
                })
        })
        .catch(e => {
            done(e);
        });

});

it('#04. all purchase-order status should be = VOID in purchase-order-external', function (done) {
    Promise.all(purchaseOrderExternal.items.map(purchaseOrder => {
        return purchaseOrderManager.getSingleById(purchaseOrder._id);
    }))
        .then((results) => {
            purchaseOrders = results;
            for (var purchaseOrder of purchaseOrders) {
                JSON.stringify(purchaseOrder.status).should.equal(JSON.stringify(poStatusEnum.VOID));
            }
            done();
        })
        .catch(e => {
            done(e);
        });
});

// it('#05. all purchase-request status should be = VOID in purchase-order-external', function (done) {
//     Promise.all(purchaseOrderExternal.items.map(purchaseOrder => {
//         return purchaseRequestManager.getSingleById(purchaseOrder.purchaseRequest._id);
//     }))
//         .then((results) => {
//             purchaseRequests = results;
//             for (var purchaseRequest of purchaseRequests) {
//                 JSON.stringify(purchaseRequest.status).should.equal(JSON.stringify(prStatusEnum.VOID));
//             }
//             done();
//         })
//         .catch(e => {
//             done(e);
//         });
// });



