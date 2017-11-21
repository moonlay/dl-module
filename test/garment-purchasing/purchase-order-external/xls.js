var should = require('should');
var helper = require("../../helper");
var PurchaseOrderExternalManager = require("../../../src/managers/garment-purchasing/purchase-order-external-manager");
var purchaseOrderExternalManager = null;
var purchaseOrderExternalDataUtil = require("../../data-util/garment-purchasing/purchase-order-external-data-util");
var purchaseOrderDataUtil = require("../../data-util/garment-purchasing/purchase-order-data-util");
var validatePO = require("dl-models").validator.garmentPurchasing.garmentPurchaseOrderExternal;
var instanceManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new PurchaseOrderExternalManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should success when generate data to Excel Report with date', function (done) {
    var startdate = null;
    var enddate   = null;
    instanceManager.getAllData(startdate, enddate)
    .then(result => {
        result.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });
});