require("should");
var PurchaseRequest = require('../../data-util/purchasing/purchase-request-data-util');
var helper = require("../../helper");
var validate = require("dl-models").validator.purchasing.purchaseRequest;

var PurchaseRequestManager = require("../../../src/managers/purchasing/purchase-request-manager");
var purchaseRequestManager = null;

before('#00. connect db', function(done) {
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
it('#01. should success when create new data', function(done) {
    PurchaseRequest.getNewTestData()
        .then(pr => {
            purchaseRequest = pr;
            validate(purchaseRequest);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should success when post', function(done) {
    purchaseRequestManager.post([purchaseRequest])
        .then(purchaseRequestIds => {
            var prId = purchaseRequestIds[0];
            purchaseRequestManager.getSingleById(prId)
                .then(pr => {
                    purchaseRequest = pr;
                    validate(purchaseRequest);
                    purchaseRequest.isPosted.should.equal(true, "purchase-request.isPosted should be true after posted");
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
