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
        .then((data) => storageManager.create(data))
        .then((id) => {
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
            data.isInventory=true;
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

it('#03. should error when create new data isInventory=true without storage', function (done) {
    unitReceiptNote.getNewData()
        .then(data => {

            data.isInventory=true;

            unitReceiptNoteManager.create(data)
                .then(id => {
                    done("should error when create new data isInventory=true without storage");
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

it('#04. should error when create new data without deliveryOrderId, unitId, supplierId', function (done) {
    unitReceiptNote.getNewData()
        .then(data => {

            data.deliveryOrder._id=null;
            data.unit._id=null;
            data.supplier._id=null;

            unitReceiptNoteManager.create(data)
                .then(id => {
                    done("should error when create new data without deliveryOrderId, unitId, supplierId");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('deliveryOrder');
                        e.errors.should.have.property('unit');
                        e.errors.should.have.property('supplier');
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

it('#05. should error when create new data with date < deliveryOrderDate', function (done) {
    unitReceiptNote.getNewData()
        .then(data => {
            var today = new Date();
            var yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            data.deliveryOrder.date=today;
            data.date=yesterday;

            unitReceiptNoteManager.create(data)
                .then(id => {
                    done("should error when create new data with date < deliveryOrderDate");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('date');
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

it('#06. should error when create new data without items', function (done) {
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

it('#07. should error when create new data with deliveredQuantity=0', function (done) {
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