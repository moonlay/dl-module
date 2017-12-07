require("should");
var PurchaseRequest = require("../../data-util/purchasing/purchase-request-data-util");
var helper = require("../../helper");
var validate = require("dl-models").purchasing.PurchaseOrderExternal;
var moment = require('moment');

var PurchaseRequestManager = require("../../../src/managers/purchasing/purchase-request-manager");
var purchaseRequestManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            purchaseRequestManager = new PurchaseRequestManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId;
it("#01. should success when create new data", function (done) {
    PurchaseRequest.getNewData()
        .then((data) => purchaseRequestManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#02. should success when create pdf', function (done) {
    purchaseRequestManager.pdf(createdId, 7)
        .then(pdfData => {
            done();
        }).catch(e => {
            done(e);
        });
});

it("#03. should success when destroy all unit test data", function (done) {
    purchaseRequestManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});