require("should");
var FPSalesContract = require("../../data-util/sales/finishing-printing-sales-contract-data-util");
var helper = require("../../helper");
var validate = require("dl-models").purchasing.PurchaseOrderExternal;
var moment = require('moment');

var FPSalesContractManager = require("../../../src/managers/sales/finishing-printing-sales-contract-manager");
var fpSalesContractRequestManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            fpSalesContractRequestManager = new FPSalesContractManager(db, {
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
    FPSalesContract.getNewData()
        .then((data) => fpSalesContractRequestManager.create(data))
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
    fpSalesContractRequestManager.pdf(createdId, 7)
        .then(pdfData => {
            done();
        }).catch(e => {
            done(e);
        });
});

it("#03. should success when destroy all unit test data", function (done) {
    fpSalesContractRequestManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should success when read data", function (done) {
    fpSalesContractRequestManager.read({
        "keyword": "TEST"
    })
        .then((documents) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});