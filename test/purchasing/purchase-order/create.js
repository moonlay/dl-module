require("should");
var helper = require("../../helper");

var purchaseRequestDataUtil = require("../../data-util/purchasing/purchase-request-data-util");
var validatePR = require("dl-models").validator.purchasing.purchaseRequest;
var PurchaseRequestManager = require("../../../src/managers/purchasing/purchase-request-manager");
var purchaseRequestManager = null;
var purchaseRequest;

var purchaseOrderDataUtil = require("../../data-util/purchasing/purchase-order-data-util");
var validatePO = require("dl-models").validator.purchasing.purchaseOrder;
var PurchaseOrderManager = require("../../../src/managers/purchasing/purchase-order-manager");
var purchaseOrderManager = null;
var purchaseOrder;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseRequestManager = new PurchaseRequestManager(db, {
                username: 'dev'
            });
            purchaseOrderManager = new PurchaseOrderManager(db, {
                username: 'dev'
            });

            purchaseRequestDataUtil.getNewTestData()
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

it('#01. should failed when create new purchase-order with unposted purchase-request', function (done) {
    purchaseOrderDataUtil.getNewData(purchaseRequest)
        .then((purchaseOrder) => {
            return purchaseOrderManager.create(purchaseOrder);
        })
        .then(po => {
            done(purchaseRequest, "purchase-request cannot be used to create purchase-order due unposted status");
        })
        .catch(e => {
            e.errors.should.have.property('purchaseRequestId');
            done();
        });
});

it('#02. should success when create new purchase-order with posted purchase-request', function (done) {
    purchaseRequestManager.post([purchaseRequest])
        .then(pr => {
            purchaseRequest = pr[0];
            purchaseOrderDataUtil.getNewData(purchaseRequest)
                .then((purchaseOrder) => {
                    return purchaseOrderManager.create(purchaseOrder);
                })
                .then((id) => {
                    return purchaseOrderManager.getSingleById(id);
                })
                .then(po => {
                    purchaseOrder = po;
                    // validatePO(purchaseOrder);
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

it('#03. purchase-request.isUsed should be true after create purchase-order and purchase-request.purchaseOrderIds should contains puchase-orderId', function (done) {
    var prId = purchaseRequest._id;
    purchaseRequestManager.getSingleById(prId)
        .then(pr => {
            purchaseRequest = pr;
            validatePR(purchaseRequest);
            purchaseRequest.isUsed.should.equal(true, "purchase-request.isPosted should be true after posted");
            purchaseRequest.purchaseOrderIds.find(poId => {
                return poId.toString() == purchaseOrder._id.toString();
            }).should.not.equal(null, "purchase-request.purchaseOrderIds should contains purchase-order._id");
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#04. purchase-order items should the same as purchase-request items', function (done) {
    purchaseOrder.items.length.should.equal(purchaseRequest.items.length);
    for (var poItem of purchaseOrder.items) {
        var prItem = purchaseRequest.items.find(prItem => {
            return poItem.product._id.toString() == prItem.product._id.toString();
        });
        prItem.should.not.equal(null, "an item in purchase-order not found in purchase-request");
        poItem.defaultQuantity.should.equal(prItem.quantity, "purchase-order-item.defaultQuantity does not equal purchase-request-item.quantity");
        poItem.defaultUom._id.toString().should.equal(prItem.product.uom._id.toString(), "purchase-order-item.defaultUom does not equal purchase-request-item.uom");
    }
    done();
});

it('#05. should failed when create new purchase-order with already used purchase-request', function (done) {
    purchaseOrderDataUtil.getNewData(purchaseRequest)
        .then((purchaseOrder) => {
            return purchaseOrderManager.create(purchaseOrder);
        })
        .then((id) => {
            return purchaseOrderManager.getSingleById(id);
        })
        .then(po => {
            purchaseOrder = po;
            purchaseOrder.purchaseRequest = purchaseRequest;
            purchaseOrder.purchaseRequestId = purchaseRequest._id;
            validatePO(purchaseOrder);
            done(purchaseRequest, "purchase-request cannot be used to create purchase-order due unposted status");
        })
        .catch(e => {
            e.errors.should.have.property('purchaseRequestId');
            done();
        });
});

it("#06. should success when search data with filter", function (done) {
    purchaseOrderManager.read({
        keyword: purchaseOrder.buyer.name
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