require("should");
var PurchaseRequest = require('../../data-util/purchasing/purchase-request-data-util');
var helper = require("../../helper");
var validate = require("dl-models").validator.purchasing.purchaseRequest;
var PurchaseRequestManager = require("../../../src/managers/purchasing/purchase-request-manager");
var purchaseRequestManager = null;
var prStatusEnum = require("dl-models").purchasing.enum.PurchaseRequestStatus;

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

it('#01. should success when create new posted data', function(done) {
    PurchaseRequest.getPostedData()
        .then(pr => {
            purchaseRequest = pr;
            validate(purchaseRequest);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should isPosted = true', function (done) {
    purchaseRequestManager.getSingleByQuery({ _id: purchaseRequest._id })
        .then((data) => {
            data.isPosted.should.be.Boolean();
            data.isPosted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#03. should success when unposting purchase-request', function (done) {
    purchaseRequestManager.unpost(purchaseRequest._id)
        .then((pr) => {
            purchaseRequest = pr;
            purchaseRequest.isPosted.should.equal(false);
            JSON.stringify(purchaseRequest.status).should.equal(JSON.stringify(prStatusEnum.CREATED));
            done();
        })
        .catch(e => {
            done(e);
        });

});