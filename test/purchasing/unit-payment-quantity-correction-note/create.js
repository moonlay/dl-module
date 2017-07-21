require("should");
var helper = require("../../helper");

var unitPaymentQuantityCorrectionNoteDataUtil = require("../../data-util/purchasing/unit-payment-quantity-correction-note-data-util");
var UnitPaymentQuantityCorrectionNoteManager = require("../../../src/managers/purchasing/unit-payment-quantity-correction-note-manager");
var unitPaymentQuantityCorrectionNoteManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            unitPaymentQuantityCorrectionNoteManager = new UnitPaymentQuantityCorrectionNoteManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should error when create with empty data ', function(done) {
    unitPaymentQuantityCorrectionNoteManager.create({})
        .then((id) => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

// it('#02. should success when create new unit-payment-quantity-correction-note', function (done) {
//     unitPaymentQuantityCorrectionNoteDataUtil.getNewTestDataInsertTwice()
//         .then((data) => {
//             data.should.instanceof(item);
//             done();
//         })
//         .catch(e => {
//             done(e);
//         });
// });


// it('#03. should success when get pdf ', function(done) {
//     unitPaymentQuantityCorrectionNoteManager.pdf(createdId)
//         .then((binary) => {
//             result.should.instanceof(binary);
//             done();
//         })
//         .catch(e => {
//             try {
//                 done();
//             }
//             catch (ex) {
//                 done(ex);
//             }
//         });
// });

it("#02. should success when get report with date parameter", function(done) {
    unitPaymentQuantityCorrectionNoteManager.getMonitoringKoreksi({"dateForm" : "2017-02-01", "dateTo" : "2017-02-01"})
        .then((result) => {
            result.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var resultForExcelTest = {};
it('#03. should success when get data with Start Date', function (done) {
    var query = {};
    query.dateFrom = "2017-02-01";
    query.dateTo = "2017-02-01";

    unitPaymentQuantityCorrectionNoteManager.getMonitoringKoreksi(query)
        .then(result => {
            var po = result;
            resultForExcelTest.data = [{
            ndDate : new Date(),
            ndNo:"A221",
            spbNo:"AAA",
            no:"BBB",
            no:"aaaa",
            returNoteNo:"ccc",
            incomeTaxCorrectionNo:"ccc",
            incomeTaxCorrectionDate: new Date(),
            unit:"ccc",
            category:"ccc",
            supplierName:"CCC",
            productCode:"AKSJ",
            productName:"AAA",
            productQuantity:100,
            productUom:"MTR",
            productPricePerUnit:2000,
            productPriceTtl:2000,
            _createdBy:"AAA"}];
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#04. should success when get data for Excel Report', function (done) {
    var query = {};
    query.dateFrom = "2017-02-01";
    query.dateTo = "2017-02-01";

    unitPaymentQuantityCorrectionNoteManager.getXls(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});