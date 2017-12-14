'use strict';
var should = require('should');
var helper = require("../../helper");
var InventoryDocumentManager = require("../../../src/managers/inventory/inventory-document-manager");
var inventoryDocumentManager = null;
var inventoryDocumentDataUtil = require("../../data-util/inventory/inventory-document-data-util");
var validate = require("dl-models").validator.inventory.inventoryDocument;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            inventoryDocumentManager = new InventoryDocumentManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#01. should error when create new data without productId, uomId, quantity=0', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then(data => {

            data.items[0].quantity = 0;
            data.items[0].productId = {};
            data.items[0].uomId = {};

            inventoryDocumentManager.create(data)
                .then(id => {
                    done("should error when create new data without productId, uomId, quantity=0");
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

it("#02. should success when read data", function (done) {
    inventoryDocumentManager.read({
        "keyword": "TEST"
    })
        .then((documents) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});