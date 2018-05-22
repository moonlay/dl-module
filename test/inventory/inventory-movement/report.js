require("should");
var InventoryMovement = require("../../data-util/inventory/inventory-movement-data-util");
var helper = require("../../helper");
var moment = require("moment");
var validate = require("dl-models").validator.inventory.inventoryMovement;

var InventoryMovementManager = require("../../../src/managers/inventory/inventory-movement-manager");
var inventoryMovementManager = null;

//delete unitest data
// var DLModels = require('dl-models');
// var map = DLModels.map;
// var MachineType = DLModels.master.MachineType;


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            inventoryMovementManager = new InventoryMovementManager(db, {
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
    InventoryMovement.getNewData()
        .then((data) => inventoryMovementManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#01.(2) should success when create new data", function (done) {
    InventoryMovement.getNewTestData2()
        .then((data) =>
            inventoryMovementManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#01.(3) should success when create new data", function (done) {
    InventoryMovement.getNewTestData3()
        .then((data) => inventoryMovementManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#01.(4) should success when create new data", function (done) {
    InventoryMovement.getNewTestData4()
        .then((data) => inventoryMovementManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#01.(5) should success when create new data", function (done) {
    InventoryMovement.getNewTestData5()
        .then((data) => inventoryMovementManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdData;
it(`#02. should success when get created data with id`, function (done) {
    inventoryMovementManager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            validate(data);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var resultForExcelTest = {};
it("#03. should success when read data", function (done) {
    inventoryMovementManager.getMovementReport({
        "filter": {
            "_id": createdId
        },
        "offset": 0,
        "keyword": "TEST"
    })
        .then((documents) => {
            resultForExcelTest = documents;
            documents.should.have.property("data");
            documents.data.should.be.instanceof(Array);
            documents.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var filter = {};
it('#04. should success when get data for Excel Report', function (done) {
    inventoryMovementManager.getXls(resultForExcelTest, filter)
        .then(xlsData => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it("#05. should success when destroy all unit test data", function (done) {
    inventoryMovementManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});