'use strict';

var should = require('should');
var helper = require("../helper");
var validatorPurchasing = require('dl-models').validator.purchasing;
var PurchaseOrderBaseManager = require("../../src/managers/purchasing/purchase-order-manager");
var purchaseOrderManager = null;
var purchaseOrder = require('../data').transaction.purchaseOrder;

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            purchaseOrderManager = new PurchaseOrderBaseManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var purchaseOrderId;
it('#01. should success when create new data purchase order', function(done) {
    purchaseOrder.getNew()
        .then(data => {
            data._id.should.be.Object();
            purchaseOrderId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#02. should success when split purchase order', function(done) {
    purchaseOrderManager.getSingleByQuery({
            _id: purchaseOrderId
        })
        .then(result => {
            result.sourcePurchaseOrderId = result._id;
            result.sourcePurchaseOrder = result;
            for (var purchaseOrderItem of result.items) {
                purchaseOrderItem.defaultQuantity = 1;
            }
            purchaseOrderManager.split(result)
                .then(id => {
                    id.should.be.Object();
                    done();
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

var purchaseOrder;
it(`#03. should success when get created data purchase order with id`, function(done) {
    purchaseOrderManager.getSingleByQuery({
            _id: purchaseOrderId
        })
        .then(data => {
            validatorPurchasing.purchaseOrder(data);
            data.should.instanceof(Object);
            purchaseOrder = data;
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#04. should success when update created data purchase order`, function(done) {
    purchaseOrder.remark += '[updated]';
    purchaseOrderManager.update(purchaseOrder)
        .then(id => {
            purchaseOrderId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#05. should success when get updated data purchase order with id`, function(done) {
    purchaseOrderManager.getSingleByQuery({
            _id: purchaseOrderId
        })
        .then(data => {
            data.no.should.equal(purchaseOrder.no);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#06. should success when delete data purchase order`, function(done) {
    purchaseOrderManager.delete(purchaseOrder)
        .then(id => {
            purchaseOrderId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#07. should _deleted=true`, function(done) {
    purchaseOrderManager.getSingleByQuery({
            _id: purchaseOrderId
        })
        .then(data => {
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        });
});
