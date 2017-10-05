require("should");
var WeavingSalesContract = require("../../data-util/sales/weaving-sales-contract-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.weavingSalesContract;
var moment = require('moment');

var WeavingSalesContractManager = require("../../../src/managers/sales/weaving-sales-contract-manager");
var weavingSalesContractManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            weavingSalesContractManager = new WeavingSalesContractManager(db, {
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
    WeavingSalesContract.getNewData()
        .then((data) => weavingSalesContractManager.create(data))
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

    weavingSalesContractManager.pdf(createdId, 7)
        .then(pdfData => {
            done();
        }).catch(e => {
            done(e);
        });
});

it("#03. should success when destroy all unit test data", function (done) {
    weavingSalesContractManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});