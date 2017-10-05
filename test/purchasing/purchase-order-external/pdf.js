require("should");
var POExternal = require("../../data-util/purchasing/purchase-order-external-data-util");
var helper = require("../../helper");
var validate = require("dl-models").purchasing.PurchaseOrderExternal;
var moment = require('moment');

var POExternalManager = require("../../../src/managers/purchasing/purchase-order-external-manager");
var poExternalManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            poExternalManager = new POExternalManager(db, {
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
    POExternal.getNewData()
        .then((data) => poExternalManager.create(data))
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
    poExternalManager.getSingleById(createdId)
        .then((data) => {
            poExternalManager.pdf(data, 7)
                .then(pdfData => {
                    done();
                }).catch(e => {
                    done(e);
                });
        })
});

it("#03. should success when destroy all unit test data", function (done) {
    poExternalManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});