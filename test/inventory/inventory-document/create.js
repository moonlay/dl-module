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

var outId;
it("#01. should success when create new data using status OUT", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {
            data.type = "OUT";
            return inventoryDocumentManager.create(data)
        })
        .then((id) => {
            outId = id;
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var adjId
it("#02. should success when create new data using status ADJ", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {
            data.type = "ADJ";
            return inventoryDocumentManager.create(data)
        })
        .then((id) => {
            adjId = id;
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var inId;
it("#03. should success when create new data using status IN", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {
            return inventoryDocumentManager.create(data)
        })
        .then((id) => {
            inId = id;
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var scrambledId
it("#04. should success when create new data using scrambled item", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            var newItems = data.items.map((item) => {
                var tempUom = item.uomId;
                var tempSecondUom = item.secondUomId;
                var tempThirdUom = item.thirdUomId;
                var tempQuantity = item.quantity;
                var tempSecondQuantity = item.secondQuantity;
                var tempThirdQuantity = item.thirdQuantity;

                item.uomId = tempThirdUom;
                item.quantity = tempThirdQuantity;
                item.secondUomId = tempUom;
                item.secondQuantity = tempQuantity;
                item.thirdUomId = tempSecondUom;
                item.thirdQuantity = tempSecondQuantity;

                return item;
            })

            data.items = newItems

            return inventoryDocumentManager.create(data)
        })
        .then((id) => {
            scrambledId = id;
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var oneUomId
it("#05. should success when create new data one uom only", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            var newItems = data.items.map((item) => {
                
                item.secondUomId = {};
                item.secondQuantity = 0;
                item.thirdUomId = {};
                item.thirdQuantity = 0;

                return item;
            })

            data.items = newItems

            return inventoryDocumentManager.create(data)
        })
        .then((id) => {
            oneUomId = id;
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var twoUomId
it("#06. should success when create new data two uom only", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            var newItems = data.items.map((item) => {
                var tempUom = item.uomId;
                var tempThirdUom = item.thirdUomId;
                var tempQuantity = item.quantity;
                var tempThirdQuantity = item.thirdQuantity;

                item.uomId = tempThirdUom;
                item.quantity = tempThirdQuantity;
                item.secondUomId = tempUom;
                item.secondQuantity = tempQuantity;
                item.thirdUomId = {};
                item.thirdQuantity = 0;

                return item;
            })

            data.items = newItems

            return inventoryDocumentManager.create(data)
        })
        .then((id) => {
            twoUomId = id;
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#07. should success when destroy all inventory data", function (done) {
     Promise.all([inventoryDocumentManager.collection.drop(), inventoryDocumentManager.inventoryMovementManager.collection.drop(), inventoryDocumentManager.inventorySummaryManager.collection.drop()])
        .then((results) => {
            results.should.be.Array();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var singleId;
it("#08. should success when create new data using single uom", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            var newItems = data.items.map((item) => {

                item.secondUomId = {};
                item.secondQuantity = 0;
                item.thirdUomId = {};
                item.thirdQuantity = 0;

                return item;
            })

            data.items = newItems

            return inventoryDocumentManager.create(data)
        })
        .then((id) => {
            singleId = id;
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var doubleId;
it("#09. should success when create new data using two uom", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            var newItems = data.items.map((item) => {

                item.thirdUomId = {};
                item.thirdQuantity = 0;

                return item;
            })

            data.items = newItems

            return inventoryDocumentManager.create(data)
        })
        .then((id) => {
            doubleId = id;
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#10. should success when create new data using three uom", function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {
            return inventoryDocumentManager.create(data)
        })
        .then((id) => {
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});