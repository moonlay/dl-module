require("should");
var helper = require("../../helper");

var purchaseRequestDataUtil = require("../../data-util/garment-purchasing/purchase-request-data-util");
var purchaseOrderDataUtil = require("../../data-util/garment-purchasing/purchase-order-data-util");
var validatePO = require("dl-models").validator.garmentPurchasing.garmentPurchaseOrder;
var PurchaseOrderManager = require("../../../src/managers/garment-purchasing/purchase-order-manager");
var purchaseOrderManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseOrderManager = new PurchaseOrderManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var listPurchaseOrder = [];
it('#01. should success when get new data purchase-request ', function (done) {
    purchaseRequestDataUtil.getNewTestData()
        .then(purchaseRequest => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should success when get data by keyword', function (done) {
    purchaseOrderManager.purchaseRequestManager.getPurchaseRequestByTag()
        .then(data => {
            listPurchaseOrder = data;
            data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId = {};
it('#03. should success when create new purchase-order', function (done) {
    purchaseOrderManager.createMultiple(listPurchaseOrder)
        .then(data => {
            data.should.be.instanceof(Array);
            createdId = data[0];
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdData;
var purchaseOrder;
it(`#04. should success when get created data with id`, function (done) {
    purchaseOrderManager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            validatePO(data);
            createdData = Object.assign({},data);
            purchaseOrder = Object.assign({},data);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#05. should error when split quantity with same amount as default quantity', function (done) {
    createdData.sourcePurchaseOrderId = purchaseOrder._id
    createdData.sourcePurchaseOrder = Object.assign({},purchaseOrder);
    purchaseOrderManager.split(createdData)
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

it('#06. should success when split quantity purchase-order', function (done) {
    createdData.items.map((item) => {
        item.defaultQuantity = item.defaultQuantity / 2;
    })

    purchaseOrderManager.split(createdData)
        .then((id) => {

            var query = {
                "purchaseRequest.no": createdData.purchaseRequest.no,
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
