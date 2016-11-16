require("should");
var helper = require("../../helper");

var purchaseRequestDataUtil = require('../../data').transaction.purchaseRequest;
var validatePR = require("dl-models").validator.purchasing.purchaseRequest;
var PurchaseRequestManager = require("../../../src/managers/purchasing/purchase-request-manager");
var purchaseRequestManager = null;
var purchaseRequest;

var purchaseOrderDataUtil = require('../../data').transaction.purchaseOrder;
var validatePO = require("dl-models").validator.purchasing.purchaseOrder;
var PurchaseOrderManager = require("../../../src/managers/purchasing/purchase-order-manager");
var purchaseOrderManager = null;
var purchaseOrder;

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            purchaseRequestManager = new PurchaseRequestManager(db, {
                username: 'dev'
            });
            purchaseOrderManager = new PurchaseOrderManager(db, {
                username: 'dev'
            });

            purchaseRequestDataUtil.getNew()
                .then(pr => {
                    purchaseRequest = pr;
                    validatePR(purchaseRequest);
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

it('#01. should failed when create new purchase-order with unposted purchase-request', function(done) {
    purchaseOrderDataUtil.getNew()
        .then(po => {
            purchaseOrder = po;
            validatePO(purchaseOrder);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should success when create new purchase-order with posted purchase-request', function(done) {

    purchaseOrderManager.update(purchaseOrder)
        .then(pr => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

// it('#03. purchase-request.isUsed should be true after create purchase-order', function(done) {
//     var prId = purchaseRequest._id;
//     purchaseRequestManager.getSingleById(prId)
//         .then(pr => {
//             purchaseRequest = pr;
//             validatePR(purchaseRequest);
//             purchaseRequest.isUsed.should.equal(true, "purchase-request.isPosted should be true after posted");
//             done();
//         })
//         .catch(e => {
//             done(e);
//         });
// }); 

// it('#04. purchase-order items should the same as purchase-request items', function(done) {
//     purchaseOrder.items.length.should.equal(purchaseRequest.items.length);
//     for (var poItem of purchaseOrder.items) {
//         var prItem = purchaseRequest.items.find(prItem => {
//             return poItem.product._id.toString() == prItem.product._id.toString();
//         });
//         prItem.should.not.equal(null, "an item in purchase-order not found in purchase-request");
//         poItem.defaultQuantity.should.equal(prItem.quantity, "purchase-order-item.defaultQuantity does not equal purchase-request-item.quantity");
//         poItem.defaultUom._id.toString().should.equal(prItem.uom._id.toString(), "purchase-order-item.defaultUom does not equal purchase-request-item.uom");
//     }
//     done();
// });
