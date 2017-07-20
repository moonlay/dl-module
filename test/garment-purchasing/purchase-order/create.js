require("should");
var helper = require("../../helper");

var purchaseRequestDataUtil = require("../../data-util/garment-purchasing/purchase-request-data-util");
var validatePR = require("dl-models").validator.garmentPurchasing.purchaseRequest;
var PurchaseRequestManager = require("../../../src/managers/garment-purchasing/purchase-request-manager");
var purchaseRequestManager = null;
var purchaseRequest;

var purchaseOrderDataUtil = require("../../data-util/garment-purchasing/purchase-order-data-util");
var validatePO = require("dl-models").validator.garmentPurchasing.purchaseOrder;
var PurchaseOrderManager = require("../../../src/managers/garment-purchasing/purchase-order-manager");
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

        })
        .catch(e => {
            done(e);
        });
});

var listPurchaseOrder = [];
it('#01. should success when get new data purchase-request ', function (done) {
    purchaseRequest.getNewTestData()
        .then((purchaseRequest) => {
            return purchaseOrder.getNewData(purchaseRequest);
        })
        .then(po => {
            listPurchaseOrder.push(po); //1
            return purchaseRequest.getNewTestData()
        }).then((purchaseRequest) => {
            return purchaseOrder.getNewData(purchaseRequest);
        })
        .then(po => {
            listPurchaseOrder.push(po);//2
            return purchaseRequest.getNewTestData()
        }).then((purchaseRequest) => {
            return purchaseOrder.getNewData(purchaseRequest);
        })
        .then(po => {
            listPurchaseOrder.push(po);//3
            return purchaseRequest.getNewTestData()
        }).then((purchaseRequest) => {
            return purchaseOrder.getNewData(purchaseRequest);
        })
        .then(po => {
            listPurchaseOrder.push(po);//4
            done();
        })
        .catch(e => {
        });
});

it('#02. should success when create new purchase-order', function (done) {
    purchaseOrderManager.createMultiple(listPurchaseOrder)
        .then(pr => {
            done();
        })
        .catch(e => {
            done(e);
        });
});