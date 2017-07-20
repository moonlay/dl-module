require("should");
var helper = require("../../helper");

var purchaseRequestDataUtil = require("../../data-util/garment-purchasing/purchase-request-data-util");
var purchaseOrderDataUtil = require("../../data-util/garment-purchasing/purchase-order-data-util");
var validatePO = require("dl-models").validator.garmentPurchasing.garmentPurchaseOrder;
var PurchaseOrderManager = require("../../../src/managers/garment-purchasing/purchase-order-manager");
var purchaseOrderManager = null;
var purchaseOrder = {};

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseOrderManager = new PurchaseOrderManager(db, {
                username: 'dev'
            });

            purchaseOrderDataUtil.getNewTestData()
                .then(po => {
                    purchaseOrder = po;
                    validatePO(purchaseOrder);
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

it('#01. should error when split quantity with same amount as default quantity', function (done) {
    purchaseOrder.sourcePurchaseOrderId = purchaseOrder._id;
    purchaseOrderManager.split(purchaseOrder)
        .then((id) => {
            return purchaseOrderManager.getSingleById(id);
        })
        .then(po => {
            done();
        })
        .catch(e => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                e.errors.should.have.property("items");

                for(var err of e.errors.items) {
                    err.should.have.property("defaultQuantity");
                }

                done();
            }
            catch (ex) {
                done(e);
            }
        });
});

it('#02. should success when split quantity purchase-order', function (done) {

    purchaseOrder.items.map((item) => {
        item.defaultQuantity = item.defaultQuantity / 2;
    })

    purchaseOrderManager.split(purchaseOrder)
        .then((id) => {

            var query = {
                "purchaseRequest.no": purchaseOrder.purchaseRequest.no,
                _deleted: false
            };
            return purchaseOrderManager.collection.find(query).toArray();
        })
        .then(pos => {

            if (pos.length == 1)
                done(e);
            else
                done();
        })
        .catch(e => {
            done(e);
        });
});
