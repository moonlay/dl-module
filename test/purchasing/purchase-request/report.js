require("should");
var PurchaseRequest = require('../../data-util/purchasing/purchase-request-data-util');
var helper = require("../../helper");
var validate = require("dl-models").validator.purchasing.purchaseRequest;
var PurchaseRequestManager = require("../../../src/managers/purchasing/purchase-request-manager");
var purchaseRequestManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseRequestManager = new PurchaseRequestManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var purchaseRequest;
it('#01. should success when create 5 new data', function (done) {
    PurchaseRequest.getPostedData()
        .then(pr => {
            purchaseRequest = pr;
            PurchaseRequest.getPostedData()
        })
        .then(pr => {
            done()
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should success when get data report PR Without Parameter', function (done) {
    purchaseRequestManager.getDataPRMonitoring()
    .then(pr => {
        pr.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#02. should success when get data report PR using Parameter', function (done) {
    purchaseRequestManager.getDataPRMonitoring(purchaseRequest.unitId, purchaseRequest.categoryId, purchaseRequest.budgetId, purchaseRequest.no, new Date(), new Date(), 2, 7, "dev")
    .then(pr => {
        pr.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});