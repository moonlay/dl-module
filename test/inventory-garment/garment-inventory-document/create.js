'use strict';
var should = require('should');
var helper = require("../../helper");
var GarmentInventoryDocumentManager = require("../../../src/managers/inventory-garment/garment-inventory-document-manager");
var garmentInventoryDocumentManager = null;
var garmentInventoryDocumentDataUtil = require("../../data-util/inventory-garment/garment-inventory-document-data-util");
var validate = require("dl-models").validator.inventory.inventoryDocument;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            garmentInventoryDocumentManager = new GarmentInventoryDocumentManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it("#01. should success when create new data using status OUT", function (done) {
    garmentInventoryDocumentDataUtil.getNewData()
        .then((data) => {
            data.type = "OUT";

            return garmentInventoryDocumentManager.create(data)
        })
        .then((id) => {
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when create new data using status ADJ", function (done) {
    garmentInventoryDocumentDataUtil.getNewData()
        .then((data) => {
            data.type = "ADJ";
            return garmentInventoryDocumentManager.create(data)
        })
        .then((id) => {
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success when read data", function (done) {
    garmentInventoryDocumentManager.read({ "keyword": "test" })
        .then((data) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});
