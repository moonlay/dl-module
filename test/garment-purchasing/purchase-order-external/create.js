require("should");
var helper = require("../../helper");

var purchaseRequestDataUtil = require("../../data-util/garment-purchasing/purchase-request-data-util");
var purchaseOrderDataUtil = require("../../data-util/garment-purchasing/purchase-order-data-util");
var PurchaseOrderManager = require("../../../src/managers/garment-purchasing/purchase-order-manager");
var purchaseOrderManager = null;
var purchaseOrders;

var purchaseOrderExternalDataUtil = require("../../data-util/garment-purchasing/purchase-order-external-data-util");
var validatePO = require("dl-models").validator.garmentPurchasing.garmentPurchaseOrderExternal;
var PurchaseOrderExternalManager = require("../../../src/managers/garment-purchasing/purchase-order-external-manager");
var purchaseOrderExternalManager = null;
var purchaseOrderExternal;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseOrderManager = new PurchaseOrderManager(db, {
                username: 'unit-test'
            });
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

it('#02. purchase-orders supplier & currency should be the same with one in purchase-order-external', function (done) {
    Promise.all(purchaseOrders.map(purchaseOrder => {
        return purchaseOrderManager.getSingleById(purchaseOrder._id);
    }))
        .then(results => {
            purchaseOrders = results;
            for (var purchaseOrder of purchaseOrders) {
                purchaseOrder.isClosed.should.equal(true);
            }
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#03. should success when posting purchase-order-external', function (done) {
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

it('#04. purchase-orders supplier & currency should be the same with one in purchase-order-external', function (done) {
    Promise.all(purchaseOrders.map(purchaseOrder => {
        return purchaseOrderManager.getSingleById(purchaseOrder._id);
    }))
        .then(results => {
            purchaseOrders = results;
            for (var purchaseOrder of purchaseOrders) {
                purchaseOrder.isPosted.should.equal(true);
            }
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#05. should success when generate pdf purchase-order-external', function (done) {
    purchaseOrderExternalManager.pdf(purchaseOrderExternal._id, 7)
        .then(results => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#06. delete collection', function (done) {
    if (purchaseOrderExternalManager.db.databaseName !== "dl-dev" && purchaseOrderExternalManager.db.databaseName !== "dl-uat" && purchaseOrderExternalManager.db.databaseName !== "danliris-prd") {
        purchaseOrderExternalManager.collection.remove({})
            .then(results => {
                purchaseOrderExternalManager.purchaseRequestManager.collection.remove({})
                    .then(results => {
                        purchaseOrderExternalManager.purchaseOrderManager.collection.remove({})
                            .then(results => {
                                done();
                            })
                            .catch(e => {
                                done(e);
                            });
                    })
                    .catch(e => {
                        done(e);
                    });
            })
            .catch(e => {
                done(e);
            });
    } else {
        done();
    }
});

var dataPOInternal = {};
it('#06-1. create new purchase-order-internal', function (done) {
    purchaseRequestDataUtil.getNewTestData()
        .then((res) => {
            return purchaseOrderManager.purchaseRequestManager.getPurchaseRequestByTag()
        })
        .then(data => {
            data.should.be.instanceof(Array);
            return purchaseOrderManager.createMultiple([data[0]])
        })
        .then(listId => {
            return purchaseOrderManager.getSingleById(listId[0])
        })
        .then(poInternal => {
            var purchaseOrder = Object.assign({}, poInternal);

            poInternal.items.map((item) => {
                item.defaultQuantity = item.defaultQuantity / 2;
            })
            poInternal.sourcePurchaseOrderId = purchaseOrder._id
            poInternal.sourcePurchaseOrder = Object.assign({}, purchaseOrder);
            return purchaseOrderManager.split(poInternal)
        })
        .then((id) => {
            return purchaseOrderManager.getSingleById(id);
        })
        .then((poInternal) => {
            dataPOInternal = poInternal;
            done();
        })
        .catch(e => {
            done(e);
        });
});
var listPOInternal = []
it('#06-2. should success when create new purchase-order-external with splitted purchase-orders', function (done) {
    purchaseOrderExternalDataUtil.getNew([dataPOInternal])
        .then(poe => {
            purchaseOrderExternal = poe;
            validatePO(purchaseOrderExternal);

            return purchaseOrderManager.collection.find({
                "no": dataPOInternal.sourcePurchaseOrder.no,
                "purchaseRequest.no": dataPOInternal.purchaseRequest.no,
                "items.refNo": dataPOInternal.items[0].refNo,
                "items.product.code": dataPOInternal.items[0].product.code,
                _deleted: false,
                isClosed: false
            }).toArray()
        })
        .then((_listPOInternal) => {
            listPOInternal = _listPOInternal;
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#06-3. should success when create new purchase-order-external with splitted purchase-orders', function (done) {
    purchaseOrderExternalDataUtil.getNew(listPOInternal)
        .then(poe => {
            purchaseOrderExternal = poe;
            validatePO(purchaseOrderExternal);
            done();
        })
        .catch(e => {
            done(e);
        });
});
var poId = {};
it('#07-1. should error when create new purchase-order-external with deal price grater than budget price', function (done) {
    purchaseRequestDataUtil.getNewTestData()
        .then((res) => {
            return purchaseOrderManager.purchaseRequestManager.getPurchaseRequestByTag()
        })
        .then(data => {
            data.should.be.instanceof(Array);
            return purchaseOrderManager.createMultiple(data)
        })
        .then(listId => {
            poId = listId[0];
            done()
        })

        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});

it('#07-2. should error when create new purchase-order-external with deal price grater than budget price', function (done) {
    purchaseOrderManager.getSingleById(poId)
        .then(poInternal => {
            var purchaseOrder = Object.assign({}, poInternal);

            poInternal.items.map((item) => {
                item.defaultQuantity = item.defaultQuantity / 2;
            })
            poInternal.sourcePurchaseOrderId = purchaseOrder._id
            poInternal.sourcePurchaseOrder = Object.assign({}, purchaseOrder);
            return purchaseOrderManager.split(poInternal)
        })
        .then((id) => {
            return purchaseOrderManager.getSingleById(id);
        })
        .then((poInternal) => {
            purchaseOrderExternalDataUtil.getNew([poInternal])
                .then(poe => {
                    purchaseOrderExternal = poe;
                    validatePO(purchaseOrderExternal);

                    return purchaseOrderManager.collection.find({
                        "no": poInternal.sourcePurchaseOrder.no,
                        "purchaseRequest.no": poInternal.purchaseRequest.no,
                        "items.refNo": poInternal.items[0].refNo,
                        "items.product.code": poInternal.items[0].product.code,
                        _deleted: false,
                        isClosed: false
                    }).toArray()
                })
                .then((listPOInternal) => {
                    for (var poInternal of listPOInternal) {
                        for (var item of poInternal.items) {
                            item.budgetPrice = item.budgetPrice * 2
                        }
                    }
                    purchaseOrderExternalDataUtil.getNew(listPOInternal)
                        .then((id) => {
                            done("should error when create new purchase-order-external with deal price grater than budget price");
                        })
                        .catch((e) => {
                            try {
                                e.name.should.equal("ValidationError");
                                e.should.have.property("errors");
                                e.errors.should.instanceof(Object);
                                done();
                            }
                            catch (ex) {
                                done(e);
                            }
                        });
                })
        })
});

it('#08. should error when create new purchase-order-external with isOverBudget == true OverbudgetRemark blank', function (done) {
    purchaseRequestDataUtil.getNewTestData()
        .then((res) => {
            return purchaseOrderManager.purchaseRequestManager.getPurchaseRequestByTag()
        })
        .then(data => {
            data.should.be.instanceof(Array);
            return purchaseOrderManager.createMultiple(data)
        })
        .then(listId => {
            return purchaseOrderManager.getSingleById(listId[0])
        })
        .then(poInternal => {
            var purchaseOrder = Object.assign({}, poInternal);

            poInternal.items.map((item) => {
                item.defaultQuantity = item.defaultQuantity / 2;
            })
            poInternal.sourcePurchaseOrderId = purchaseOrder._id
            poInternal.sourcePurchaseOrder = Object.assign({}, purchaseOrder);
            return purchaseOrderManager.split(poInternal)
        })
        .then((id) => {
            return purchaseOrderManager.getSingleById(id);
        })
        .then((poInternal) => {
            return purchaseOrderExternalDataUtil.getNew([poInternal])
                .then(poe => {
                    purchaseOrderExternal = poe;
                    validatePO(purchaseOrderExternal);

                    return purchaseOrderManager.collection.find({
                        "no": poInternal.sourcePurchaseOrder.no,
                        "purchaseRequest.no": poInternal.purchaseRequest.no,
                        "items.refNo": poInternal.items[0].refNo,
                        "items.product.code": poInternal.items[0].product.code,
                        _deleted: false,
                        isClosed: false
                    }).toArray()
                })
        })
        .then((listPOInternal) => {
            for (var poInternal of listPOInternal) {
                for (var item of poInternal.items) {
                    item.budgetPrice = item.budgetPrice * 2
                }
            }
            return purchaseOrderExternalDataUtil.getNewData(listPOInternal)
        })
        .then((data) => {
            for (var item of data.items) {
                item.isOverBudget = true;
                item.overBudgetRemark = "";
            }
            return purchaseOrderExternalManager.create(data)
        })
        .then((id) => {
            done("should error when create new purchase-order-external with deal price grater than budget price");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});

var overBudgetData = {};
it('#09. should success when create new purchase-order-external with isOverBudget == true', function (done) {
    purchaseRequestDataUtil.getNewTestData()
        .then((res) => {
            return purchaseOrderManager.purchaseRequestManager.getPurchaseRequestByTag()
        })
        .then(data => {
            data.should.be.instanceof(Array);
            return purchaseOrderManager.createMultiple(data)
        })
        .then(listId => {
            return purchaseOrderManager.getSingleById(listId[0])
        })
        .then(poInternal => {
            var purchaseOrder = Object.assign({}, poInternal);

            poInternal.items.map((item) => {
                item.defaultQuantity = item.defaultQuantity / 2;
            })
            poInternal.sourcePurchaseOrderId = purchaseOrder._id
            poInternal.sourcePurchaseOrder = Object.assign({}, purchaseOrder);
            return purchaseOrderManager.split(poInternal)
        })
        .then((id) => {
            return purchaseOrderManager.getSingleById(id);
        })
        .then((poInternal) => {
            return purchaseOrderExternalDataUtil.getNew([poInternal])
                .then(poe => {
                    purchaseOrderExternal = poe;
                    validatePO(purchaseOrderExternal);

                    return purchaseOrderManager.collection.find({
                        "no": poInternal.sourcePurchaseOrder.no,
                        "purchaseRequest.no": poInternal.purchaseRequest.no,
                        "items.refNo": poInternal.items[0].refNo,
                        "items.product.code": poInternal.items[0].product.code,
                        _deleted: false,
                        isClosed: false
                    }).toArray()
                })
        })
        .then((listPOInternal) => {
            for (var poInternal of listPOInternal) {
                for (var item of poInternal.items) {
                    item.budgetPrice = item.budgetPrice * 2
                }
            }
            return purchaseOrderExternalDataUtil.getNewData(listPOInternal)
        })
        .then((data) => {
            for (var item of data.items) {
                item.isOverBudget = true;
                item.overBudgetRemark = "Over Budget Remark Test";
            }
            return purchaseOrderExternalManager.create(data)
        })
        .then((id) => {
            return purchaseOrderExternalManager.getSingleById(id);
        })
        .then((data) => {
            return purchaseOrderExternalManager.post([data])
        })
        .then((ids) => {
            return purchaseOrderExternalManager.getSingleById(ids[0]);
        })
        .then(po => {
            overBudgetData = po;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#10. should success when approve over budget purchase-order-external', function (done) {
    purchaseOrderExternalManager.approve([overBudgetData])
        .then(ids => {
            purchaseOrderExternalManager.getSingleById(ids[0])
                .then(poe => {
                    purchaseOrderExternal = poe;
                    purchaseOrderExternal.isApproved.should.equal(true);
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
