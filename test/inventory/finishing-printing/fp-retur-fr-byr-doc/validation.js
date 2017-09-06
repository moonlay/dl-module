'use strict';

var should = require('should');
var helper = require("../../../helper");
var ReturManager = require("../../../../src/managers/inventory/finishing-printing/fp-retur-fr-byr-doc-manager");
var returManager = null;
var returDataUtil = require("../../../data-util/inventory/finishing-printing/fp-retur-fr-byr-doc-data-util");
var constructionDataUtil = require("../../../data-util/master/material-construction-data-util");
var validate = require("dl-models").validator.inventory.finishingPrinting.fpReturFromBuyerDoc;
var moment = require('moment');
var dateNow;
var dateAfter;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            returManager = new ReturManager(db, {
                username: 'unit-test'
            });
            dateNow = new Date();
            dateAfter = new Date();
            dateAfter = dateAfter.setDate(dateAfter.getDate() + 2);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it("#01. should error when create new data with empty data", function (done) {
    returManager.create({})
        .then((id) => {
            done("should error when create new data with empty data");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            done();
        });
});

var newData;
it("#02. should error when create new data with no exist data buyer", function (done) {
    returDataUtil.getNewData()
        .then((data) => {
                newData = data;
                var dataAdd = {
                    code : newData.code,
                    destination : newData.destination,
                    buyerId : "buyerId",
                    buyer : newData.buyer,
                    date : newData.date,
                    spk : newData.spk,
                    coverLetter : newData.coverLetter,
                    codeProduct : newData.codeProduct,
                    details : newData.details
                };
                returManager.create(dataAdd)
                    .then((id) => {
                        done("should error when create new data with no exist data buyer");
                    })
                    .catch((e) => {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        e.errors.should.have.property('buyer');
                        e.errors.should.have.property('details');
                        for(var a of e.errors.details){
                            for(var b of a.items){
                                b.should.have.property('productName');
                            }
                        }
                        done();
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#03. should error when create new data with date after this day", function (done) {
    var data = {
        code : newData.code,
        destination : newData.destination,
        buyerId : newData.buyerId,
        buyer : newData.buyer,
        date : dateAfter,
        spk : newData.spk,
        coverLetter : newData.coverLetter,
        codeProduct : newData.codeProduct,
        details : newData.details
    };
    returManager.create(data)
        .then((id) => {
            done("should error when create new data with date after this day");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('date');
            done();
        });
});

it("#04. should error when create new data with no data production order", function (done) {
    var data = {
        code : newData.code,
        destination : newData.destination,
        buyerId : newData.buyerId,
        buyer : newData.buyer,
        date : newData.date,
        spk : newData.spk,
        coverLetter : newData.coverLetter,
        codeProduct : newData.codeProduct,
        details : [{
                productionOrderNo : "",
                productionOrderId : newData.details[0].productionOrderId,
                items : newData.details[0].items
            }]
    };
    returManager.create(data)
        .then((id) => {
            done("should error when create new data with no data production order");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('details');
            for(var a of data.details){
                a.productionOrderNo = "OrderId";
            };
            returManager.create(data)
                .then((id) => {
                    done("should error when create new data with no data production order");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('details');
                    done();
                });
        });
});

it("#05. should error when create new data with no product item in details", function (done) {
    var data = {
        code : newData.code,
        destination : newData.destination,
        buyerId : newData.buyerId,
        buyer : newData.buyer,
        date : newData.date,
        spk : newData.spk,
        coverLetter : newData.coverLetter,
        codeProduct : newData.codeProduct,
        details : [{
                productionOrderNo : newData.details[0].productionOrderNo,
                productionOrderId : newData.details[0].productionOrderId,
                items : [],
                newProducts : []
            }]
    };
    returManager.create(data)
        .then((id) => {
            done("should error when create new data with no product item in details");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('details');
            for(var a of data.details){
                delete a.newProducts;
            };
            returManager.create(data)
                .then((id) => {
                    done("should error when create new data with no product item in details");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('details');
                    for(var a of data.details){
                        delete a.items;
                    };
                    returManager.create(data)
                        .then((id) => {
                            done("should error when create new data with no product item in details");
                        })
                        .catch((e) => {
                            e.name.should.equal("ValidationError");
                            e.should.have.property("errors");
                            e.errors.should.instanceof(Object);
                            e.errors.should.have.property('details');
                            done();
                        });
                });
        });
});

it("#06. should error when create new data with no data remark, weight, length, productCode in items", function (done) {
    var data = {
        code : newData.code,
        destination : newData.destination,
        buyerId : newData.buyerId,
        buyer : newData.buyer,
        date : newData.date,
        spk : newData.spk,
        coverLetter : newData.coverLetter,
        codeProduct : newData.codeProduct,
        details : [{
            productionOrderId : newData.details[0].productionOrderId,
            productionOrderNo : newData.details[0].productionOrderNo,
            items : [{
                productId:newData.details[0].items[0].productId,
                productCode:"productionCode",
                productName:newData.details[0].items[0].productName,
                productDescription:'',
                hasNewProduct : false,
                designNumber:newData.details[0].items[0].designNumber,
                designCode:newData.details[0].items[0].designCode,
                remark:'',
                colorWay:newData.details[0].items[0].colorType,
                returQuantity:2,
                uomId:newData.details[0].items[0].uomId,
                uom:newData.details[0].items[0].uomUnit,
                length:'',
                weight:''
            }]
        }]
    };
    returManager.create(data)
        .then((id) => {
            done("should error when create new data with no data remark, weight, length, productCode in items");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('details');
            for(var a of e.errors.details){
                for(var b of a.items){
                    b.should.have.property('remark');
                    b.should.have.property('length');
                    //b.should.have.property('weight');
                    b.should.have.property('productName');
                }
            }
            data.details[0].items[0].length = 0;
            data.details[0].items[0].weight = 0;
            returManager.create(data)
                .then((id) => {
                    done("should error when create new data with no data remark, weight, length, productCode in items");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('details');
                    for(var a of e.errors.details){
                        for(var b of a.items){
                            b.should.have.property('length');
                            //b.should.have.property('weight');
                        }
                    }
                    done();
                });
        });
});

// it("#07. should error when create new data with no data new product", function (done) {
//     var data = {
//         code : newData.code,
//         destination : newData.destination,
//         buyerId : newData.buyerId,
//         buyer : newData.buyer,
//         date : newData.date,
//         spk : newData.spk,
//         coverLetter : newData.coverLetter,
//         codeProduct : newData.codeProduct,
//         details : [{
//                 productionOrderNo : newData.details[0].productionOrderNo,
//                 productionOrderId : newData.details[0].productionOrderId,
//                 items : newData.details[0].items,
//                 newProducts : []
//             }]
//     };
//     returManager.create(data)
//         .then((id) => {
//             done("should error when create new data with no data production order");
//         })
//         .catch((e) => {
//             e.name.should.equal("ValidationError");
//             e.should.have.property("errors");
//             e.errors.should.instanceof(Object);
//             e.errors.should.have.property('details');
//             done();
//         });
// });

it("#07. should error when create new data with no productName, description, remark, uom, length, weight, lot, grade, construction in new Product", function (done) {
    var data = {
        code : newData.code,
        destination : newData.destination,
        buyerId : newData.buyerId,
        buyer : newData.buyer,
        date : newData.date,
        spk : newData.spk,
        coverLetter : newData.coverLetter,
        codeProduct : newData.codeProduct,
        details : [{
                productionOrderNo : newData.details[0].productionOrderNo,
                productionOrderId : newData.details[0].productionOrderId,
                items : newData.details[0].items,
                newProducts : [{
                    productName:'',
                    description:'',
                    designNumber:newData.details[0].items[0].designNumber,
                    designCode:newData.details[0].items[0].designCode,
                    remark:'',
                    colorWay:newData.details[0].items[0].colorType,
                    returQuantity:2,
                    uom:'',
                    length:'',
                    weight:'',
                    lot:'',
                    grade:'',
                    construction:''
                }]
            }]
    };
    returManager.create(data)
        .then((id) => {
            done("should error when create new data with no productName, description, remark, uom, length, weight, lot, grade, construction in new Product");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property('details');
            for(var a of e.errors.details){
                for(var b of a.newProducts){
                    b.should.have.property('length');
                    //b.should.have.property('weight');
                    b.should.have.property('productName');
                    b.should.have.property('description');
                    b.should.have.property('remark');
                    b.should.have.property('uom');
                    b.should.have.property('lot');
                    b.should.have.property('grade');
                    b.should.have.property('construction');
                }
            }
            data.details[0].newProducts[0].length = 0;
            data.details[0].newProducts[0].weight = 0;
            data.details[0].newProducts[0].construction = "constructionId";
            returManager.create(data)
                .then((id) => {
                    done("should error when create new data with no productName, description, remark, uom, length, weight, lot, grade, construction in new Product");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('details');
                    for(var a of e.errors.details){
                        for(var b of a.newProducts){
                            b.should.have.property('length');
                            //b.should.have.property('weight');
                            b.should.have.property('construction');
                        }
                    }
                    done();
                });
        });
});

it("#08. should success when create new data with new Product", function (done) {
    constructionDataUtil.getTestData()
        .then(dataCons => {
            var data = {
                    code : newData.code,
                    destination : newData.destination,
                    buyerId : newData.buyerId,
                    buyer : newData.buyer,
                    date : newData.date,
                    spk : newData.spk,
                    coverLetter : newData.coverLetter,
                    codeProduct : newData.codeProduct,
                    details : [{
                            productionOrderNo : newData.details[0].productionOrderNo,
                            productionOrderId : newData.details[0].productionOrderId,
                            items : newData.details[0].items,
                            newProducts : [{
                                productName:'T-Shirt',
                                description:'XL',
                                designNumber:newData.details[0].items[0].designNumber,
                                designCode:newData.details[0].items[0].designCode,
                                remark:'BS',
                                colorWay:newData.details[0].items[0].colorType,
                                returQuantity:2,
                                uom:newData.details[0].items[0].uom,
                                length:2,
                                weight:2,
                                lot:'Lot',
                                grade:'Grade',
                                construction:dataCons.code
                            }]
                        }]
                };
                returManager.create(data)
                    .then((id) => {
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
        })
        .catch((e) => {
            done(e);
        });
});


