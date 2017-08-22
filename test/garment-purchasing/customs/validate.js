'use strict';

var should = require('should');
var helper = require("../../helper");
var CustomsManager = require("../../../src/managers/garment-purchasing/customs-manager");
var customsManager = null;
var customsDataUtil = require("../../data-util/garment-purchasing/customs-data-util");
var validate = require("dl-models").validator.garmentPurchasing.customs;
var moment = require('moment');
var dateNow;
var dateAfter;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            customsManager = new CustomsManager(db, {
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
    customsManager.create({})
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

it("#02. should error when create new data with no exist data supplier", function (done) {
    customsDataUtil.getNewData()
        .then((data) => {
                data.supplierId = "supplierId";
                customsManager.create(data)
                    .then((id) => {
                        done("should error when create new data with no exist data supplier");
                    })
                    .catch((e) => {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        e.errors.should.have.property('supplier');
                        done();
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#03. should error when create new data with no exist data currency", function (done) {
    customsDataUtil.getNewData()
        .then((data) => {
                data.currencyId = "currencyId";
                customsManager.create(data)
                    .then((id) => {
                        done("should error when create new data with no exist data currency");
                    })
                    .catch((e) => {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        e.errors.should.have.property('currency');
                        done();
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#04. should error when create new data with customs date more than this day", function (done) {
    customsDataUtil.getNewData()
        .then((data) => {
                data.customsDate = moment(dateAfter).format('YYYY-MM-DD');
                customsManager.create(data)
                    .then((id) => {
                        done("should error when create new data with customs date more than this day");
                    })
                    .catch((e) => {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        e.errors.should.have.property('customsDate');
                        done();
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#05. should error when create new data with validation date more than this day", function (done) {
    customsDataUtil.getNewData()
        .then((data) => {
                data.validateDate = moment(dateAfter).format('YYYY-MM-DD');
                customsManager.create(data)
                    .then((id) => {
                        done("should error when create new data with validation date more than this day");
                    })
                    .catch((e) => {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        e.errors.should.have.property('validateDate');
                        done();
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#06. should error when create new data with validation date less than customs date", function (done) {
    customsDataUtil.getNewData()
        .then((data) => {
                var date = new Date();
                date = date.setDate(date.getDate() - 2);
                data.validateDate = moment(date).format('YYYY-MM-DD');
                customsManager.create(data)
                    .then((id) => {
                        done("should error when create new data with validation date less than customs date");
                    })
                    .catch((e) => {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        e.errors.should.have.property('validateDate');
                        done();
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#07. should error when create new data with bruto less than netto", function (done) {
    customsDataUtil.getNewData()
        .then((data) => {
                data.bruto = 15;
                data.netto = 20;
                customsManager.create(data)
                    .then((id) => {
                        done("should error when create new data with bruto less than netto");
                    })
                    .catch((e) => {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        e.errors.should.have.property('netto');
                        done();
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#08. should error when create new data with no exist data delivery order", function (done) {
    customsDataUtil.getNewData()
        .then((data) => {
                var tamp = [];
                for(var a of data.deliveryOrders){
                    a._id = "id";
                    tamp.push(a);
                }
                data.deliveryOrders = tamp;
                customsManager.create(data)
                    .then((id) => {
                        done("should error when create new data with bruto less than netto");
                    })
                    .catch((e) => {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        e.errors.should.have.property('deliveryOrders');
                        e.errors.deliveryOrders.should.instanceof(Array);
                        done();
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#09. should error when create new data with same no, supplier, customs date, validation date", function (done) {
    customsDataUtil.getNewData()
        .then((data) => {
                customsManager.create(data)
                    .then((id1) => {
                        customsManager.create(data)
                            .then((id2) => {
                                done("should error when create new data with same no, supplier, customs date, validation date");
                            })
                            .catch((e) => {
                                e.name.should.equal("ValidationError");
                                e.should.have.property("errors");
                                e.errors.should.instanceof(Object);
                                e.errors.should.have.property('no');
                                done();
                            });
                    })
                    .catch((e) => {
                        done(e);
                    });
            })
            .catch((e) => {
                done(e);
            });
});