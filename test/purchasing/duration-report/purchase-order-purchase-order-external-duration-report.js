require("should");
var helper = require("../../helper");

var purchaseRequestDataUtil = require('../../data').purchasing.purchaseRequest;
var validatePR = require("dl-models").validator.purchasing.purchaseRequest;
var PurchaseRequestManager = require("../../../src/managers/purchasing/purchase-request-manager");
var purchaseRequestManager = null;
var purchaseRequest;


var generateCode = require('../../../src/utils/code-generator');

var purchaseOrderDataUtil = require('../../data').purchasing.purchaseOrder;
var validatePO = require("dl-models").validator.purchasing.purchaseOrder;
var PurchaseOrderManager = require("../../../src/managers/purchasing/purchase-order-manager");
var purchaseOrderManager = null;
var purchaseOrder;
var purchaseOrders=[];
var purchaseRequests=[];
var purchaseRequestsPosted=[];

var purchaseOrderExternalDataUtil = require('../../data').purchasing.purchaseOrderExternal;
var validatePO = require("dl-models").validator.purchasing.purchaseOrderExternal;
var PurchaseOrderExternalManager = require("../../../src/managers/purchasing/purchase-order-external-manager");
var purchaseOrderExternalManager = null;
var purchaseOrderExternal;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseRequestManager = new PurchaseRequestManager(db, {
                username: 'dev'
            });
             purchaseOrderManager = new PurchaseOrderManager(db, {
                username: 'dev'
            });
            purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdDataPR;
var createdIdPR;
var purchaseRequest;
it("#01. should success when create new data PR 1", function(done) {
    purchaseRequestDataUtil.getNewData()
    .then((data) =>{
        var targetDate=new Date();
        data.date.setDate(targetDate.getDate() - 10);
        createdDataPR=data;
        purchaseRequestManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdIdPR = id;
            purchaseRequestManager.getSingleById(id)
                .then(pr => {
                    purchaseRequest = pr;
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
    });
});

var createdDataPR;
var createdIdPR;
var purchaseRequest2;
it("#02. should success when create new data PR 2", function(done) {
    purchaseRequestDataUtil.getNewData()
    .then((data) =>{
        var targetDate=new Date();
        data.date.setDate(targetDate.getDate() - 20);
        createdDataPR=data;
        purchaseRequestManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdIdPR = id;
            purchaseRequestManager.getSingleById(id)
                .then(pr => {
                    purchaseRequest2 = pr;
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
    });
});

var purchaseRequest3;
it("#03. should success when create new data PR 3", function(done) {
    purchaseRequestDataUtil.getNewData()
    .then((data) =>{
        var targetDate=new Date();
        data.date.setDate(targetDate.getDate() - 35);
        createdDataPR=data;
        purchaseRequestManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdIdPR = id;
            purchaseRequestManager.getSingleById(id)
                .then(pr => {
                    purchaseRequest3 = pr;
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
    });
});

it('#04. should success when post PR', function(done) {
    purchaseRequestManager.post([purchaseRequest,purchaseRequest2,purchaseRequest3])
        .then(purchaseRequests => {
            var prId = purchaseRequests[0]._id;
            var prId2 = purchaseRequests[1]._id;
            var prId3 = purchaseRequests[2]._id;
            purchaseRequestManager.getSingleById(prId)
                .then(pr => {
                    purchaseRequest = pr;
                    validatePR(purchaseRequest);
                    purchaseRequest.isPosted.should.equal(true, "purchase-request.isPosted should be true after posted");
                    
                })
                .catch(e => {
                    done(e);
                });
            purchaseRequestManager.getSingleById(prId2)
                .then(pr => {
                    purchaseRequest2 = pr;
                    validatePR(purchaseRequest2);
                    purchaseRequest2.isPosted.should.equal(true, "purchase-request.isPosted should be true after posted");
                    
                })
                .catch(e => {
                    done(e);
                });
                purchaseRequestManager.getSingleById(prId3)
                .then(pr => {
                    purchaseRequest3 = pr;
                    validatePR(purchaseRequest3);
                    purchaseRequest3.isPosted.should.equal(true, "purchase-request.isPosted should be true after posted");
                    
                })
                .catch(e => {
                    done(e);
                });
                done();
        })
        .catch(e => {
            done(e);
        });
});

var createdDataPO;
var createdIdPO;
var purchaseOrder;
it("#05. should success when create new data PO 1", function(done) {
    purchaseOrderDataUtil.getNewData()
    .then((data) =>{
        data.purchaseRequest=purchaseRequest;
        data.purchaseRequestId=purchaseRequest._id;
        createdDataPO=data;
        purchaseOrderManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdIdPO = id;
            purchaseOrderManager.getSingleById(id)
                .then(po => {
                    purchaseOrder = po;
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
    });
});

var createdDataPO2;
var createdIdPO2;
var purchaseOrder2;
it("#06. should success when create new data PO 2", function(done) {
    purchaseOrderDataUtil.getNewData()
    .then((data) =>{
        data.purchaseRequest=purchaseRequest2;
        data.purchaseRequestId=purchaseRequest2._id;
        createdDataPO2=data;
        purchaseOrderManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdIdPO2 = id;
            purchaseOrderManager.getSingleById(id)
                .then(po => {
                    purchaseOrder2 = po;
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
    });
});

var createdDataPO3;
var createdIdPO3;
var purchaseOrder3;
it("#07. should success when create new data PO 3", function(done) {
    purchaseOrderDataUtil.getNewData()
    .then((data) =>{
        data.purchaseRequest=purchaseRequest3;
        data.purchaseRequestId=purchaseRequest3._id;
        createdDataPO3=data;
        purchaseOrderManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdIdPO3 = id;
            purchaseOrderManager.getSingleById(id)
                .then(po => {
                    purchaseOrder3 = po;
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
    });
});

var purchaseOrderExternal;
it('#08. should success when create new purchase-order-external 1 with purchase-orders', function(done) {
    purchaseOrderExternalDataUtil.getNew([purchaseOrder,purchaseOrder2,purchaseOrder3])
        .then(poe => {
            var targetDate=new Date();
            poe.date.setDate(targetDate.getDate() +10);
            purchaseOrderExternal = poe;
            validatePO(purchaseOrderExternal);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#09. should success when update purchase-order-external', function (done) {
    purchaseOrderExternal.items.splice(0, 1);
    var targetDate=new Date();
    purchaseOrderExternal.date.setDate(targetDate.getDate() +10);
    purchaseOrderExternalManager.update(purchaseOrderExternal)
        .then((id) => {
            return purchaseOrderExternalManager.getSingleById(id).then(po => {
                    purchaseOrderExternal = po;
                });
        })
        .then(po => {
            done();
        })
        .catch(e => {
            done(e);
        });
});



it('#10. should success when posting purchase-order-external', function(done) {
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


var resultForExcelTest = {};
it('#11. should success when get data with Start Date and Duration 8-14 days', function (done) {
    var query = {};
    query.dateFrom = purchaseOrder._createdDate;
    query.duration = "8-14 hari";

    purchaseOrderExternalManager.getDurationPOData(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#12. should success when get data for Excel Report', function (done) {
    var query = {};
    query.duration = "8-14 hari";

    purchaseOrderExternalManager.getXlsDurationPOData(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#13. should success when get data for Excel Report using dateFrom only', function (done) {
    var query = {};
    query.dateFrom = createdDataPO.purchaseRequest.date;
    query.duration = "8-14 hari";

    purchaseOrderExternalManager.getXlsDurationPOData(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#14. should success when get data for Excel Report using dateTo only', function (done) {
    var query = {};
    query.dateTo = new Date();
    query.duration = "> 30 hari";

    purchaseOrderExternalManager.getXlsDurationPOData(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#15. should success when get data for Excel Report using both dateFrom and dateTo', function (done) {
    var query = {};
    query.dateFrom = createdDataPO2.purchaseRequest.date;
    query.dateTo = new Date();
    query.duration = "15-30 hari";

    purchaseOrderExternalManager.getXlsDurationPOData(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#16. should success when unposting purchase-order-external', function (done) {
    purchaseOrderExternalManager.unpost(purchaseOrderExternal._id)
        .then((poExId) => {
            purchaseOrderExternalManager.getSingleById(poExId)
                .then((poe) => {
                    purchaseOrderExternal = poe;
                    purchaseOrderExternal.isPosted.should.equal(false);
                    done();
                })
        })
        .catch(e => {
            done(e);
        });

});

it('#17. should success when update purchase-order-external', function (done) {
    var targetDate=new Date();
    purchaseOrderExternal.date.setDate(targetDate.getDate() +20);
    purchaseOrderExternalManager.update(purchaseOrderExternal)
        .then((id) => {
            return purchaseOrderExternalManager.getSingleById(id).then(po => {
                    purchaseOrderExternal = po;
                });
        })
        .then(po => {
            done();
        })
        .catch(e => {
            done(e);
        });
});



it('#18. should success when posting purchase-order-external', function(done) {
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

it('#19. should success when get data with Start Date, End Date and Duration 15-30 days', function (done) {
    var query = {};
    query.dateFrom = new Date( purchaseOrder._createdDate);
    query.dateTo = new Date(purchaseOrderExternal.date);
    query.duration = "15-30 hari";

    purchaseOrderExternalManager.getDurationPOData(query)
        .then(result => {
            var po = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#20. should success when unposting purchase-order-external', function (done) {
    purchaseOrderExternalManager.unpost(purchaseOrderExternal._id)
        .then((poExId) => {
            purchaseOrderExternalManager.getSingleById(poExId)
                .then((poe) => {
                    purchaseOrderExternal = poe;
                    purchaseOrderExternal.isPosted.should.equal(false);
                    done();
                })
        })
        .catch(e => {
            done(e);
        });

});

it('#21. should success when update purchase-order-external', function (done) {
    var targetDate=new Date();
    purchaseOrderExternal.date.setDate(targetDate.getDate() +35);
    purchaseOrderExternalManager.update(purchaseOrderExternal)
        .then((id) => {
            return purchaseOrderExternalManager.getSingleById(id).then(po => {
                    purchaseOrderExternal = po;
                });
        })
        .then(po => {
            done();
        })
        .catch(e => {
            done(e);
        });
});



it('#22. should success when posting purchase-order-external', function(done) {
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
it('#23. should success when get data with Start Date, End Date and Duration >30 days', function (done) {
    var query = {};
    query.dateFrom = new Date( purchaseOrder._createdDate);
    query.dateTo = new Date(purchaseOrderExternal.date);
    query.duration = "> 30 hari";

    purchaseOrderExternalManager.getDurationPOData(query)
        .then(result => {
            var po = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});
