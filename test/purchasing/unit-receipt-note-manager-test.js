var helper = require("../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitReceiptNoteManager = require("../../src/managers/purchasing/unit-receipt-note-manager");
var DeliveryOrderManager = require("../../src/managers/purchasing/delivery-order-manager");
var unitReceiptNoteManager = null;
var deliveryOrderManager = null;
var UnitReceiptNoteItem = require('dl-models').purchasing.UnitReceiptNoteItem;

require("should");
function getDataUnitReceiptNote() {
    var UnitReceiptNote = require('dl-models').purchasing.UnitReceiptNote;

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    
    var unitReceiptNote = new UnitReceiptNote();
    unitReceiptNote.no = code;
    unitReceiptNote.date = now;
    unitReceiptNote.remark = `remark ${code}`;
    return unitReceiptNote;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            unitReceiptNoteManager = new UnitReceiptNoteManager(db, {
                username: 'unit-test'
            });
            
            deliveryOrderManager = new DeliveryOrderManager(db, {
                username: 'unit-test'
            });
            
            done();
        })
        .catch(e => {
            done(e);
        })
});

var deliveryOrder={};
it(`#01. should success when get data delivery Order with id`, function (done) {
    deliveryOrderManager.getSingleById("5809c33e5cd4ed25c415385e")
        .then(data => {
            data.should.instanceof(Object);
            deliveryOrder = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#02. should success when read data', function (done) {
    unitReceiptNoteManager.read()
        .then(documents => {
            //process documents
            documents.data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;
it('#03. should success when create new data', function (done) {
    var unitReceiptNoteItem = new UnitReceiptNoteItem();
    var unit={};
    for (var doItem of deliveryOrder.items)
    {
        for(var doItemFulfillment of doItem.fulfillments)
        {
            unitReceiptNoteItem.product = doItemFulfillment.product;
            unitReceiptNoteItem.deliveredQuantity = doItemFulfillment.deliveredQuantity;
            unitReceiptNoteItem.deliveredUom = doItemFulfillment.purchaseOrderUom;
            unitReceiptNoteItem.purchaseOrderQuantity = doItemFulfillment.purchaseOrderQuantity;
            unitReceiptNoteItem.purchaseOrderId = doItemFulfillment.purchaseOrder._id;
            unitReceiptNoteItem.purchaseOrder = doItemFulfillment.purchaseOrder;
            
            for(var _poItem of doItemFulfillment.purchaseOrder.items){
                if(_poItem.product._id.equals(doItemFulfillment.product._id)){
                unitReceiptNoteItem.pricePerDealUnit = _poItem.pricePerDealUnit;
                unitReceiptNoteItem.currency = _poItem.currency;
                unitReceiptNoteItem.currencyRate = _poItem.currencyRate;
                break;
                }
            }
            unit=doItemFulfillment.purchaseOrder.unit;
        }
    }
    var data = getDataUnitReceiptNote();
    data.unit=unit;
    data.unitId=unit._id;
    data.supplier=deliveryOrder.supplier;
    data.supplierId=deliveryOrder.supplier._id;
    data.deliveryOrder=deliveryOrder;
    data.deliveryOrderId=deliveryOrder._id;
    data.items=[];
    data.items.push(unitReceiptNoteItem);
    
    unitReceiptNoteManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdData;
it(`#04. should success when get created data with id`, function (done) {
    unitReceiptNoteManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#05. should success when update created data`, function (done) {
    createdData.remark += '[updated]';

    unitReceiptNoteManager.update(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#06. should success when get updated data with id`, function (done) {
    unitReceiptNoteManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            data.no.should.equal(createdData.no); 
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#07. should success when delete data`, function (done) {
    unitReceiptNoteManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#08 should error when create new data with same code', function (done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    unitReceiptNoteManager.create(data)
        .then(id => {
            id.should.be.Object(); 
            done();
        })
        .catch(e => {
            e.errors.should.have.property('no');
            done();
        })
});

it('#09 should error when create new blank data', function (done) {
    unitReceiptNoteManager.create({})
        .then(id => {
            id.should.be.Object(); 
            done();
        })
        .catch(e => {
            e.errors.should.have.property('no');
            e.errors.should.have.property('unit');
            e.errors.should.have.property('supplier');
            e.errors.should.have.property('deliveryOrder');
            done();
        })
});