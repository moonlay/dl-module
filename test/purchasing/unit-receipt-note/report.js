var helper = require("../../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var UnitReceiptNoteManager = require("../../../src/managers/purchasing/unit-receipt-note-manager");
var unitReceiptNoteManager = null;
//var unitReceiptNote = require("../../data-util/purchasing/unit-receipt-note-data-util");

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
        });
});


it('#01. should success get data when parameter null', function (done) {
    unitReceiptNoteManager.getUnitReceiptWithoutSpb()
      .then(data => {
        data.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });
});

it('#02. should success get data when parameter unitId, dateFrom and dateTo', function (done) {
    var unitId= "";
    var dateTo=new Date();
    var dateFrom = new Date();
    
    dateFrom.setDate(dateFrom.getDate() - 1);

    unitReceiptNoteManager.getUnitReceiptWithoutSpb(unitId,dateFrom,dateTo)
      .then(data => {
        data.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });
});


it('#03. should success get data when parameter null', function (done) {
    unitReceiptNoteManager.getUnitReceiptNotes()
      .then(data => {
        data.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });
});

it('#04. should success when get data report PR using Parameter', function (done) {
    var no=null;
    var unitId=null;
    var categoryId=null;
    var supplierId=null;
    var dateFrom=new Date();
    var dateTo=new Date();
    var offset=null;
    var createdBy=null;
    dateFrom.setDate(dateFrom.getDate() - 1);
    unitReceiptNoteManager.getUnitReceiptNotes(no, unitId, categoryId, supplierId, dateFrom, dateTo, offset,  createdBy)
    .then(data => {
        data.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});
