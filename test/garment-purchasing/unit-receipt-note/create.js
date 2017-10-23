var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitReceiptNoteManager = require("../../../src/managers/garment-purchasing/unit-receipt-note-manager");
var unitReceiptNoteManager = null;
var unitReceiptNote = require("../../data-util/garment-purchasing/unit-receipt-note-data-util");
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
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdData;
it('#01. should success when create new data', function (done) {
    unitReceiptNote.getNewData()
        .then((data) => unitReceiptNoteManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#02. should error when create new data with same code', function (done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    unitReceiptNoteManager.create(data)
        .then(id => {
            id.should.be.Object();
            done();
        })
        .catch(e => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        })
});

it('#03. should error when create new blank data', function (done) {
    unitReceiptNoteManager.create({})
        .then(id => {
            id.should.be.Object();
            done();
        })
        .catch(e => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        })
});

it("#04. should error when create new data with deliveredQuantity greater than deliveredQuantity on delivery order", function (done) {
    unitReceiptNote.getNewData()
        .then((data) => {
            data.items.map((item) => {
                item.deliveredQuantity = item.deliveredQuantity + 2;
            })
            return unitReceiptNoteManager.create(data)
        })
        .then(id => {
            id.should.be.Object();
            done();
        })
        .catch(e => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        })
});

//validator useStorage

var storageData;
var storageDataId;
it('#05. should success when create new data', function (done) {
    storage.getNewData()
        .then((data) => storageManager.create(data))
        .then((id) => {
            storageManager.getSingleById(id)
            .then((data) => {
                storageData=data;
                
            });
            
                id.should.be.Object();
                storageDataId = id;
                done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should success when create new data when useStorage is true", function (done) {
     unitReceiptNote.getNewData()
        .then((data) => {
            data.storageId=storageDataId;
            data.unit=storageData.unit;
            data.useStorage=true;
            unitReceiptNoteManager.create(data)
            .then((id) => {
                id.should.be.Object();
                var createdId = id;
                done();
            })
        })
        .catch((e) => {
            done(e);
        });
});

it('#07. should error when create new data useStorage=true without storage', function (done) {
    unitReceiptNote.getNewData()
        .then(data => {
            data.useStorage=true;
            unitReceiptNoteManager.create(data)
                .then(id => {
                    done("should error when create new data useStorage=true without storage");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('storage');
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
