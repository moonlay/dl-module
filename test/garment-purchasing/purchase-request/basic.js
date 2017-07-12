require("should");
var helper = require("../../helper");
var validate = require("dl-models").validator.garmentPurchasing.garmentPurchaseRequest;
var PurchaseRequestManager = require("../../../src/managers/garment-purchasing/garment-purchase-request-manager");
var purchaseRequestManager = null;
var PurchaseRequest = require('../../data-util/garment-purchasing/purchase-request-data-util');

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
it('#01. should success when create new data', function (done) {
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

it(`#02. should success when get single data`, function (done) {
    purchaseRequestManager.getSingleById(purchaseRequest._id)
        .then((data) => {
            validate(data);
            purchaseRequest = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#03. should success when update data`, function (done) {
    purchaseRequest.remark = "#test";
    purchaseRequestManager.updateCollectionPR(purchaseRequest)
        .then((data) => {
            validate(data);
            purchaseRequest = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#04. should success when read data', function (done) {
    purchaseRequestManager.read({})
        .then(documents => {
            documents.should.have.property("data");
            documents.data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#05. should success when read all data', function (done) {
    purchaseRequestManager.getAllDataPR({ _deleted: false })
        .then(data => {
            data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#06. should success when get data by keyword', function (done) {
    purchaseRequestManager.getPurchaseRequestByTag("#buyer1")
        .then(data => {
            data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#07. should success when get data report PR Without Parameter', function (done) {
    purchaseRequestManager.getDataPRMonitoring()
        .then(data => {
            data.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });

});

it('#08. should success when get data report PR using Parameter', function (done) {
    purchaseRequestManager.getDataPRMonitoring(purchaseRequest.unitId, purchaseRequest.categoryId, purchaseRequest.budgetId, purchaseRequest.no, new Date(), new Date(), 2, 7, "dev")
        .then(data => {
            data.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });

});