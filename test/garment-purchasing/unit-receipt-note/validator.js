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
it('#01. should success when create new data storage', function (done) {
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

var createdData;
it('#02. should success when create new data with storage', function (done) {
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

it('#03. should error when create new data useStorage=true without storage', function (done) {
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


it('#05. should error when create new data without items', function (done) {
    unitReceiptNote.getNewData()
        .then(data => {
            
            data.items=[];

            unitReceiptNoteManager.create(data)
                .then(id => {
                    done("should error when create new data without items");
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

it('#06. should error when create new data with deliveredQuantity=0', function (done) {
    unitReceiptNote.getNewData()
        .then(data => {
            
            data.items[0].deliveredQuantity=0;

            unitReceiptNoteManager.create(data)
                .then(id => {
                    done("should error when create new data with deliveredQuantity=0");
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

it('#07. should error when create new data with storage.unit != data.unit', function (done) {
    unitReceiptNote.getNewData()
        .then(data => {
            
            data.unit.code="a";
            data.storageId=storageDataId;
            data.useStorage=true;

            unitReceiptNoteManager.create(data)
                .then(id => {
                    done("should error when create new data with storage.unit != data.unit");
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