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

it("#01. should success when create new data using status OUT", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {
            data.type = "OUT";
           return inventoryDocumentManager.create(data)})
        .then((id) => {
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when create new data using status ADJ", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {
            data.type = "ADJ";
            return inventoryDocumentManager.create(data)})
        .then((id) => {
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});
