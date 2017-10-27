require("should");
var helper = require("../../../helper");

var FPShipmentDocumentManager = require("../../../../src/managers/inventory/finishing-printing/fp-shipment-document-manager");
var FPShipmentDocumentDataUtil = require("../../../data-util/inventory/finishing-printing/fp-shipment-document-data-util");
var manager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new FPShipmentDocumentManager(db, {
                username: 'dev'
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
            data.details[0].items[0].quantity = 0;

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
    createdData.details[0].items[0].quantity = Number.MAX_SAFE_INTEGER;

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
