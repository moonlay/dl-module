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

it('#01. should error when create with empty data ', function(done) {
    purchaseRequestManager.create({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                e.errors.should.have.property('date');
                e.errors.should.have.property('unit');
                e.errors.should.have.property('category');
                e.errors.should.have.property('budget');
                e.errors.should.have.property('items');
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

var purchaseRequest;
it('#02. should success when create new data', function(done) {
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
