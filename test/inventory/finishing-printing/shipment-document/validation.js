require("should");
var helper = require("../../../helper");

var ProductionOrderDataUtil = require("../../../data-util/sales/production-order-data-util");
var FPShipmentDocumentManager = require("../../../../src/managers/inventory/finishing-printing/fp-shipment-document-manager");
var FPShipmentDocumentDataUtil = require("../../../data-util/inventory/finishing-printing/fp-shipment-document-data-util");
var manager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new FPShipmentDocumentManager(db, {
                username: "unit-test"
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdData;
it("#01. should error when create with item quantity less than or equal to zero", function (done) {
    FPShipmentDocumentDataUtil
        .getNewData()
        .then((data) => {
            createdData = data;
            data.details[0].items[0].packingReceiptItems[0].quantity = 0;

            manager.create(data)
                .then((id) => {
                    done("Should not be able to create with item quantity less than or equal zero");
                })
                .catch((e) => {
                    try {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        });
});

it("#02. should error when create with item quantity greater than stock", function (done) {
    createdData.details[0].items[0].packingReceiptItems[0].quantity = Number.MAX_SAFE_INTEGER;

    manager.create(createdData)
        .then((id) => {
            done("Should not be able to create with item quantity greater than stock");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#03. should success when search with keyword", function (done) {
    manager.read({ keyword: "Moonlay Technologies" })
        .then((e) => {
            e.should.have.property("data");
            e.data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should error when create with tomorrow date", function (done) {
    var date = new Date();
    date.setDate(date.getDate() + 1);
    var data = {
        deliveryDate: new Date(date)
    };

    manager.create(data)
        .then((id) => {
            done("should error when create with tomorrow date");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#04. should error when create with duplicate order number", function (done) {
    createdData.details.push(createdData.details[0]);
    manager.create(createdData)
        .then((id) => {
            done("should error when create with duplicate order number");
        })
        .catch((e) => {
            try {
                e.name.should.equal("ValidationError");
                e.should.have.property("errors");
                e.errors.should.instanceof(Object);
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});



var processWhite;
it("#05. should success when get production order data, process name white ", function (done) {
    ProductionOrderDataUtil.getNewWhiteOrderTypeData()
        .then((result) => {
            console.log(result.orderNo);
            processWhite=result.orderNo;
            done();
        })
        .catch(e => {
            done(e);
        });
});

var prosesPrinting;
it("#06. should success when get production order data, process type printing ", function (done) {
    ProductionOrderDataUtil.getNewPrintingOrderTypeData()
        .then((result) => {
            console.log(result.orderNo);
            prosesPrinting=result.orderNo;
            done();
        })
        .catch(e => {
            done(e);
        });
});

var processDyeing;
it("#07. should success when get production order data, process name Dyeing ", function (done) {
    ProductionOrderDataUtil.getNewDyeingOrderTypeData()
        .then((result) => {
            console.log(result.orderNo);
            processDyeing=result.orderNo;
            done();
        })
        .catch(e => {
            done(e);
        });
});

var PO;
it("#08. should success when get filter shipment ", function (done) {
    manager.filterShipmentBuyer()
        .then((result) => {
            result.should.be.instanceof(Array);
            PO = result;
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#09. should success when create data filter shipment 1 ", function (done) {
    var dataPo1 = processWhite;

    // for (var i of PO) {
    //     if (i.processType.name.toUpperCase() == "WHITE") {
    //         dataPo1 = i.orderNo;
    //     }
    // }
    FPShipmentDocumentDataUtil.getNewTestDataShipment(dataPo1)
        .then((res) => {
            done();
        })


});

it("#10. should success when create data filter shipment 2 ", function (done) {

    var dataPo2=processDyeing;

    // for (var i of PO) {

    //     if (i.processType.name.toUpperCase() == "DYEING") {
    //         dataPo2 = i.orderNo;
    //     }
    // }
    FPShipmentDocumentDataUtil.getNewTestDataShipment(dataPo2)
        .then((res) => {
            done()
        })
});

it("#11. should success when create data filter shipment 3 ", function (done) {

    var dataPo3=prosesPrinting;
    // for (var i of PO) {
    //     if (i.orderType.name.toUpperCase() == "PRINTING") {

    //         dataPo3 = i.orderNo;
    //     }
    // }
    FPShipmentDocumentDataUtil.getNewTestDataShipment(dataPo3)
        .then((res) => {
            done()
        })
});

var dataShiptmentDeliveryBuyer;
it("#12. should success when get data shipment ", function (done) {

    var date = new Date()
    var year = date.getFullYear();
    var month = date.getMonth();

    var filter = {
        year: parseInt(year),
        month: month + 1,
    }

    manager.getReportShipmentBuyer(filter)
        .then((res) => {
            dataShiptmentDeliveryBuyer=res;
            done()
        })
});

it("#13. should success when create data xls ", function (done) {
    
        var date = new Date()
        var year = date.getFullYear();
        var month = date.getMonth();
    
        var filter = {
            year: parseInt(year),
            month: month + 1,
        }

        var dataShiptment={
            info:dataShiptmentDeliveryBuyer
        }
    
        manager.getXlsDeliveryBuyer(dataShiptment,filter)
            .then((res) => {
                done()
            })
    });



