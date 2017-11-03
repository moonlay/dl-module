require("should");
var SpinningSalesContract = require("../../data-util/sales/spinning-sales-contract-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.spinningSalesContract;
var moment = require('moment');

var SpinningSalesContractManager = require("../../../src/managers/sales/spinning-sales-contract-manager");
var spinningSalesContractManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            spinningSalesContractManager = new SpinningSalesContractManager(db, {
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
    SpinningSalesContract.getNewData()
        .then((data) => spinningSalesContractManager.create(data))
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
    var query = {};

    spinningSalesContractManager.pdf(createdId, 7)
        .then(pdfData => {
            done();
        }).catch(e => {
            done(e);
        });
});

it("#03. should success when destroy all unit test data", function (done) {
    spinningSalesContractManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});