var helper = require("../helper");
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitPaymentPriceCorrectionNoteManager = require("../../src/managers/purchasing/unit-payment-price-correction-note-manager");
var UnitPaymentOrderManager = require("../../src/managers/purchasing/unit-payment-order-manager");
var unitPaymentPriceCorrectionNoteManager = null;
var unitPaymentOrderManager = null;
var UnitPaymentOrder = require('dl-models').purchasing.UnitPaymentOrder;
var UnitPaymentPriceCorrectionNote = require('dl-models').purchasing.UnitPaymentPriceCorrectionNote;
var UnitPaymentPriceCorrectionNoteItem = require('dl-models').purchasing.UnitPaymentPriceCorrectionNoteItem;

require("should");
function getUnitPaymentOrder() {    
    var unitPaymentOrder = new UnitPaymentOrder();
    unitPaymentOrderManager.getSingleByQuery({ _deleted: false })
        .then(data => {
            unitPaymentOrder = data;
            done();
        })
        .catch(e => {
            done(e);
        })
    
    return unitPaymentOrder;
}

function getDataUnitPaymnetPriceCorrection(unitPaymentOrder){
    var unitPaymentPriceCorrectionNote = new UnitPaymentPriceCorrectionNote();
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    
    unitPaymentPriceCorrectionNote.no = code;
    unitPaymentPriceCorrectionNote.unitPaymentOrderId = unitPaymentOrder._id;
    unitPaymentPriceCorrectionNote.unitPaymentOrder = unitPaymentOrder;
    unitPaymentPriceCorrectionNote.invoiceCorrectionNo = `invoiceCorrectionNo ${code}`;
    unitPaymentPriceCorrectionNote.invoiceCorrectionDate = now;
    unitPaymentPriceCorrectionNote.incomeTaxCorrectionNo = `incomeTaxCorrectionNo ${code}`;
    unitPaymentPriceCorrectionNote.incomeTaxCorrectionDate = now;
    unitPaymentPriceCorrectionNote.vatTaxCorrectionNo = `vatTaxCorrectionNo ${code}`;
    unitPaymentPriceCorrectionNote.vatTaxCorrectionDate = now;
    unitPaymentPriceCorrectionNote.unitCoverLetterNo = `unitCoverLetterNo ${code}`;
    unitPaymentPriceCorrectionNote.remark = `remark ${code}`;
    
    var _item=[]
    for (var item of unitPaymentOrder.items)
    {
        var unitPaymentPriceCorrectionNoteItem = new UnitPaymentPriceCorrectionNoteItem();
        var _productId = new ObjectId(item.product._id);
        var unitReceiptNoteItem = item.unitReceiptNote.items.find(function (product){
            return product._id=_productId;
        });
        
        unitPaymentPriceCorrectionNoteItem.purchaseOrderExternalId = unitReceiptNoteItem.purchaseOrder.purchaseOrderExternalId;
        unitPaymentPriceCorrectionNoteItem.purchaseOrderExternal = unitReceiptNoteItem.purchaseOrder.purchaseOrderExternal;
        unitPaymentPriceCorrectionNoteItem.purchaseRequestId = unitReceiptNoteItem.purchaseOrder.purchaseRequestId;
        unitPaymentPriceCorrectionNoteItem.purchaseRequest = unitReceiptNoteItem.purchaseOrder.purchaseRequest;
        unitPaymentPriceCorrectionNoteItem.product = item.product;
        unitPaymentPriceCorrectionNoteItem.quantity=item.unitReceiptNoteQuantity;
        unitPaymentPriceCorrectionNoteItem.uom = item.unitReceiptNoteUom;
        unitPaymentPriceCorrectionNoteItem.pricePerUnit=10;
        unitPaymentPriceCorrectionNoteItem.priceTotal=1000;
        
        _item.push(unitPaymentPriceCorrectionNote);
    }
    unitPaymentPriceCorrectionNote.items=_item;
    
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            unitPaymentPriceCorrectionNoteManager = new UnitPaymentPriceCorrectionNoteManager(db, {
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

it('#01. should success when read data', function (done) {
    unitPaymentPriceCorrectionNoteManager.read()
        .then(documents => {
            //process documents
            documents.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;
it('#02. should success when create new data', function (done) {
    var unitPaymentOrder = new UnitPaymentOrder();
    unitPaymentOrder = getUnitPaymentOrder();
    
    var data = getDataUnitPaymnetPriceCorrection(unitPaymentOrder);
    
    unitPaymentPriceCorrectionNoteManager.create(data)
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
it(`#03. should success when get created data with id`, function (done) {
    unitPaymentPriceCorrectionNoteManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validatorPurchasing.unitReceiptNote(data);
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

    unitPaymentPriceCorrectionNoteManager.update(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#05. should success when get updated data with id`, function (done) {
    unitPaymentPriceCorrectionNoteManager.getSingleByQuery({ _id: createdId })
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
    unitPaymentPriceCorrectionNoteManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#07. should error when create new data with same code', function (done) {
    var data = Object.assign({}, createdData);
    delete data._id;
    unitPaymentPriceCorrectionNoteManager.create(data)
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
    unitPaymentPriceCorrectionNoteManager.create({})
        .then(id => {
            id.should.be.Object(); 
            done();
        })
        .catch(e => {
            e.errors.should.have.property('no');
            e.errors.should.have.property('unitPaymentOrder');
            e.errors.should.have.property('invoiceCorrectionNo');
            e.errors.should.have.property('invoiceCorrectionDate');
            done();
        })
});
