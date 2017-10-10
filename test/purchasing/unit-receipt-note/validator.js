var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitReceiptNoteManager = require("../../../src/managers/purchasing/unit-receipt-note-manager");
var unitReceiptNoteManager = null;
var unitReceiptNote = require("../../data-util/purchasing/unit-receipt-note-data-util");
var StorageManager = require("../../../src/managers/master/storage-manager");
var storageManager = null;
var storage = require("../../data-util/master/storage-data-util");

require("should");

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            unitReceiptNoteManager = new UnitReceiptNoteManager(db, {
                username: 'unit-test'
            });
            storageManager = new StorageManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var storageData;
var storageDataId;
it('#01. should success when create new data', function (done) {
    storage.getNewData()
        .then(data => {
            storageData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdData;
it('#02. should success when create new data with storage', function (done) {
    unitReceiptNote.getNewData()
        .then((data) => {
            data.storageId=storageData._id;
            data.isInventory=true;
            unitReceiptNoteManager.create(data)
            .then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
            })
        })
        .catch((e) => {
            done(e);
        });
});
