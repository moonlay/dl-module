var helper = require("../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitReceiptNoteManager = require("../../src/managers/purchasing/unit-receipt-note-manager");
var UnitPaymentOrderManager = require("../../src/managers/purchasing/unit-payment-order-manager");
var unitReceiptNoteManager = null;
var unitPaymentOrderManager = null;
var UnitReceiptNoteItem = require('dl-models').purchasing.UnitReceiptNoteItem;
var UnitPaymentOrderItem = require('dl-models').purchasing.UnitPaymentOrderItem; 

require("should");
function getDataUnitPaymentOrder() {
    var UnitPaymentOrder = require('dl-models').purchasing.UnitPaymentOrder;

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    var unitPaymentOrder = new UnitPaymentOrder();
    unitPaymentOrder.no = code;
    unitPaymentOrder.date = now;
    unitPaymentOrder.invoceNo = code;
    unitPaymentOrder.invoceDate = now;
    unitPaymentOrder.incomeTaxNo = code;
    unitPaymentOrder.incomeTaxDate = now;
    unitPaymentOrder.vatNo = code;
    unitPaymentOrder.vatDate = now;
    unitPaymentOrder.dueDate = now;
    unitPaymentOrder.vatRate = 1;
    unitPaymentOrder.remark = `remark ${code}`;
    return unitPaymentOrder;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            unitReceiptNoteManager = new UnitReceiptNoteManager(db, {
                username: 'unit-test'
            });
            unitPaymentOrderManager = new UnitPaymentOrderManager(db, {
                username: 'unit-test'
            });

            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId = "5809dfcc70fcf5421c57d705";
var createdData;
it(`#01. should success when get created data with id`, function (done) {
    unitReceiptNoteManager.getSingleByIdOrDefault(createdId)
        .then(data => {
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var idUnitPaymentOrder;
it('#02. should success when create new data', function (done) {
    var data = getDataUnitPaymentOrder();
    var unitPaymentOrderItem = new UnitPaymentOrderItem();
    if (createdData) {
        unitPaymentOrderItem.unitReceiptNoteId = createdData._id;
        unitPaymentOrderItem.unitReceiptNote = createdData;
    } 
    data.vat= {"_id": "5809dfcc70fcf5421c57d705"};
    data.currency= {"_id": "5809dfcc70fcf5421c57d705"};
    data.category= {"_id": "5809dfcc70fcf5421c57d705"};
    data.termPayment='cash';
    data.unit = createdData.unit;
    data.unitId = createdData.unit._id;
    data.supplier = createdData.supplier;
    data.supplierId = createdData.supplier._id;
    data.items = [];
    data.items.push(unitPaymentOrderItem);

    unitPaymentOrderManager.create(data)
        .then(id => {
            id.should.be.Object();
            idUnitPaymentOrder = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var unitPaymentOrderData;;
it(`#03. should success when get created data with id`, function (done) {
    unitPaymentOrderManager.getSingleByQuery({ _id: idUnitPaymentOrder })
        .then(data => { 
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#04. should success when update created data`, function (done) {
    createdData.remark += '[updated]';

    unitPaymentOrderManager.update(createdData)
        .then(id => {
            idUnitPaymentOrder.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#05. should success when get updated data with id`, function (done) {
    unitPaymentOrderManager.getSingleByQuery({ _id: idUnitPaymentOrder })
        .then(data => {
            data.no.should.equal(createdData.no);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#06. should success when delete data`, function (done) {
    unitPaymentOrderManager.delete(createdData)
        .then(id => {
            idUnitPaymentOrder.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#07. should error when create new data with same code', function (done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    unitPaymentOrderManager.create(data)
        .then(id => {
            id.should.be.Object();
            done();
        })
        .catch(e => {
            e.errors.should.have.property('no');
            done();
        })
});

it('#08. should error when create new blank data', function (done) {
    unitPaymentOrderManager.create({})
        .then(id => {
            id.should.be.Object();
            done();
        })
        .catch(e => {
            e.errors.should.have.property('no');
            e.errors.should.have.property('unit');
            e.errors.should.have.property('supplier');
            done();
        })
});