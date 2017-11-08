require("should");
var PackingReceipt = require("../../../data-util/inventory/finishing-printing/fp-packing-receipt-data-util");
var helper = require("../../../helper");
var validate = require("dl-models").validator.inventory.finishingPrinting.fpPackingReceipt;

var generateCode = require("../../../../src/utils/code-generator");
var PackingReceiptManager = require("../../../../src/managers/inventory/finishing-printing/fp-packing-receipt-manager");
var packingReceiptManager = null;

//delete unitest data
// var DLModels = require('dl-models');
// var map = DLModels.map;
// var MachineType = DLModels.master.MachineType;


before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            packingReceiptManager = new PackingReceiptManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdId;
it("#01. should success when create new data", function (done) {
    PackingReceipt.getNewData()
        .then((data) => packingReceiptManager.create(data))
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
    packingReceiptManager.getSingleById(createdId)
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

var selectedCreatedProduct;
var selectedCreatedProductId;
it(`#03. should success when get created product data`, function (done) {
    selectedCreatedProductId = createdData.items[0].productId;
    packingReceiptManager.productManager.getSingleById(selectedCreatedProductId)
        .then((data) => {
            data.should.instanceof(Object);
            selectedCreatedProduct = data;
            selectedCreatedProductId = data._id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#04. should success when delete product data`, function (done) {
    packingReceiptManager.productManager.delete(selectedCreatedProduct)
        .then((id) => {
            id.toString().should.equal(selectedCreatedProductId.toString());
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should success when destroy data with id", function (done) {
    packingReceiptManager.productManager.destroy(selectedCreatedProductId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdPacking;
var createdPackingId;
it(`#06. should success when get packing data`, function (done) {
    packingReceiptManager.packingManager.getSingleById(createdData.packingId)
        .then((data) => {
            data.should.instanceof(Object);
            createdPacking = data;
            createdPackingId = data._id
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var newCreatedId;
it("#07. should success when create new data with non exist product", function (done) {
    var item = createdData.items.find((createdDataItem) => createdDataItem.productId.toString() === selectedCreatedProductId.toString());
    var dataItems = [{
        product: item.product,
        quantity: item.quantity,
        remark: item.remark,
        notes: "TEST"
    }];
    var newDataUtil = {
        code: generateCode(),
        packingId: createdPacking._id,
        packingCode: createdPacking.code,
        // storageName: storage.name,
        storage: createdData.storage,
        date: new Date(),
        accepted: true,
        remark: "UT packing receipt",
        items: dataItems
    };
    packingReceiptManager.create(newDataUtil)
        .then((id) => {
            id.should.be.Object();
            newCreatedId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});