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

it('#01. should error when create with empty data ', function (done) {
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
it('#02. should success when create new data', function (done) {
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

it('#02. (02) should success when create new data', function (done) {
    PurchaseRequest.getNewTestData2()
        .then(pr => {
            purchaseRequest = pr;
            validate(purchaseRequest);
            done();
        })
        .catch(e => {
            done(e);
        });
});


it('#02. should error when create new data using duplicate item', function (done) {
    PurchaseRequest.getNewData()
        .then(pr => {
            pr.items[1] = pr.items[0];
            var item = Object.assign({},pr.items[1]);
            delete item.product;
            pr.items.push(item);
            purchaseRequestManager.create(pr)
                .then(id => {
                    done("should error when create with empty data");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('items');
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch(e => {
            done(e);
        });
});

it("#03. should success when search data with filter", function (done) {
    purchaseRequestManager.read({
        keyword: purchaseRequest.unit.name
    })
        .then((documents) => {
            //process documents
            documents.should.have.property("data");
            documents.data.should.be.instanceof(Array);
            documents.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
