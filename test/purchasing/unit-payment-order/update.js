var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitPaymentOrderManager = require("../../../src/managers/purchasing/unit-payment-order-manager");
var unitPaymentOrderManager = null;
var unitPaymentOrder = require("../../data-util/purchasing/unit-payment-order-data-util");
var unitReceiptNote = require('../../data-util/purchasing/unit-receipt-note-data-util');

require("should");

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            unitPaymentOrderManager = new UnitPaymentOrderManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;
it('#01. should success when create new data', function (done) {
    unitPaymentOrder.getNewData()
        .then((data) => unitPaymentOrderManager.create(data))
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
it('#01. should success when create new data', function (done) {
    unitPaymentOrderManager.getSingleById(createdId)
        .then((data) => {
            data.should.be.Object();
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it('#02. should success when update data (remove item)', function (done) {
    delete createdData.items[0];
    unitPaymentOrderManager.update(createdData)
        .then((id) => {
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

it('#03. should success when update data (add item)', function (done) {
    unitReceiptNote.getNewData()
        .then((data) => {
            var _item = {
                unitReceiptNoteId: data._id,
                unitReceiptNote: data
            }
            createdData.items.push(_item);
            unitPaymentOrderManager.update(createdData)
        })
        .then((id) => {
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

it('#04. should success when get data detail report Surat Perintah Bayar', function (done) {
        var unitId =null;
       
        var supplierId = null;
        var dateFrom = null;
        var dateTo = null;
     
      
    unitPaymentOrderManager.getDataMonitorSpb(unitId,supplierId,dateFrom,dateTo)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#05. should success when update position', function (done) {
    let data = {
        position: 2,
        unitPaymentOrders: [createdData.no],
    };

    unitPaymentOrderManager.updatePosition(data)
        .then((res) => {
            res.should.be.Object();
            res.modifiedCount.should.be.above(0);
            done();
        })
        .catch(e => {
            done(e);
        });
});