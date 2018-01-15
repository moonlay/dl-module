require("should");
var InventorySummaryDataUtil = require('../../data-util/inventory/inventory-summary-data-util');

var productDataUtil = require('../../data-util/master/product-data-util');
var storageDataUtil = require('../../data-util/master/storage-data-util');
var uomDataUtil = require('../../data-util/master/uom-data-util');

var helper = require("../../helper");
var validate = require("dl-models").validator.inventory.inventorySummary;
var moment = require('moment');

var InventorySummaryManager = require("../../../src/managers/inventory/inventory-summary-manager");
var inventorySummaryManager = null;

var product = null;
var storage = null;
var uom = null;
var inventorySummary = null;

//delete unitest data
// var DLModels = require('dl-models');
// var map = DLModels.map;
// var MachineType = DLModels.master.MachineType;


before('#00. connect db', function(done) {
    helper.getDb()
        .then((db) => {
            inventorySummaryManager = new InventorySummaryManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});


it("#01. should success when getsert inexists", function(done) {

    Promise.all([productDataUtil.getRandomTestData(), storageDataUtil.getRandomTestData(), uomDataUtil.getTestData()])
        .then(results => {
            product = results[0];
            storage = results[1];
            uom = results[2];

            inventorySummaryManager.getSert(product._id, storage._id, uom._id)
                .then(data => {
                    data.should.instanceof(Object);
                    validate(data);
                    inventorySummary = data;

                    data.should.have.property("productId");
                    data.productId.toString().should.equal(product._id.toString())
                    data.should.have.property("productCode");
                    data.should.have.property("productName");
                    data.should.have.property("storageId");
                    data.storageId.toString().should.equal(storage._id.toString())
                    data.should.have.property("storageCode");
                    data.should.have.property("storageName");
                    data.should.have.property("uomId");
                    data.uomId.toString().should.equal(uom._id.toString())
                    data.should.have.property("uom");
                    data.should.have.property("quantity");

                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when getsert existing", function(done) {

    inventorySummaryManager.getSert(product._id, storage._id, uom._id)
        .then(data => {
            data.should.instanceof(Object);
            validate(data);
            data.should.have.property("_id");
            data._id.toString().should.equal(inventorySummary._id.toString())
            done();
        })
        .catch((e) => {
            done(e);
        });
});
