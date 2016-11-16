require("should");
var dataUtil = require('../../data').transaction.purchaseRequest;
var helper = require("../../helper");
var validatePR = require("dl-models").validator.purchasing.purchaseRequest;

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
    dataUtil.getNew()
        .then(pr => {
            purchaseRequest = pr;
            validatePR(purchaseRequest);
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
                    validatePR(purchaseRequest);
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
