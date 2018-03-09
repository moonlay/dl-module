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

it('#02. should success when create new unit-payment-quantity-correction-note', function (done) {
    unitPaymentQuantityCorrectionNoteDataUtil.getNewTestDataInsertTwice()
        .then((data) => {
            data._id.should.be.Object();
            createdId = data._id;
            done();
        })
        .catch(e => {
            done(e);
        });
});


it('#03. should success when get pdf ', function(done) {
    unitPaymentQuantityCorrectionNoteManager.pdf(createdId)
        .then((binary) => {
            done();
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

it("#04. should success when get report with date parameter", function(done) {
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
it('#05. should success when get data with Start Date', function (done) {
    var query = {};
    query.dateFrom = "2017-02-01";
    query.dateTo = "2017-02-01";

    unitPaymentQuantityCorrectionNoteManager.getMonitoringKoreksi(query)
        .then(result => {
            var po = result;
            resultForExcelTest.data = [{
            "date" : new Date(),
            "no":"A221",
            "unitPaymentOrder.no":"AAA",
            items:
               { 
                   quantity : 3,
                   pricePerUnit : 1000,
                   priceTotal :3000,
                   purchaseOrder :
                    {
                        purchaseOrderExternal : { no :"BBB"},
                        purchaseRequest : {  no :"aaaa"},
                        unit:{
                            name :"ccc"

                        },
                    },
                    product: {
                        code : "sss",
                        name :"sdsd",

                    },
                    currency: {
                        code : "sss",
                    },
                    uom :
                    {unit : "MTR"},
                    
               }
                ,
                unitPaymentOrder : 
                {
                    category : {
                        name : "ddd"
                    },
                    supplier : {
                        name : "aaa",
                        code : "ccc"
                    }
                },
            
            "returNoteNo":"ccc",
            "incomeTaxCorrectionNo":"ccc",
            "incomeTaxCorrectionDate": new Date(),
            "Jumlah":100,
            "HARGA":2000,
            "TOTAL":2000,
            "useIncomeTax":true,
            "_createdBy":"AAA"
        }];
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#06. should success when get data for Excel Report', function (done) {
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

it("#07. should success when read data", function (done) {
    unitPaymentQuantityCorrectionNoteManager.read({ "keyword": "test" })
        .then((data) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});