'use strict';

var should = require('should');
var helper = require("../../helper");
var DeliveryOrderManager = require("../../../src/managers/purchasing/delivery-order-manager");
var deliveryOrderManager = null;
var deliveryOrderDataUtil = require("../../data-util/purchasing/delivery-order-data-util");
var validate = require("dl-models").validator.purchasing.deliveryOrder;

var purchaseOrderDataUtil = require('../../data').purchasing.purchaseOrder;
var validatePO = require("dl-models").validator.purchasing.purchaseOrder;
var PurchaseOrderManager = require("../../../src/managers/purchasing/purchase-order-manager");
var purchaseOrderManager = null;
var purchaseOrder;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            deliveryOrderManager = new DeliveryOrderManager(db, {
                username: 'unit-test'
            });
            purchaseOrderManager = new PurchaseOrderManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId1;
var createdDO1;
it("#01. should success when create new data", function (done) {
    deliveryOrderDataUtil.getNewData()
    .then((data) =>{
        createdDO1=data;
        deliveryOrderManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdId1 = id;
            deliveryOrderManager.getSingleById(id)
                .then(_do => {
                    createdDO1 = _do;
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
    });
});

var createdId2;
var createdDO2;
it("#02. should success when create new data", function (done) {
    deliveryOrderDataUtil.getNewData()
    .then((data) =>{
        var targetDate=new Date();
        data.supplierDoDate.setDate(targetDate.getDate() + 40);
        createdDO2=data;
        deliveryOrderManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdId2 = id;
            deliveryOrderManager.getSingleById(id)
                .then(_do => {
                    createdDO2 = _do;
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
    });
});

var createdId3;
var createdDO3;
it("#03. should success when create new data", function (done) {
    deliveryOrderDataUtil.getNewData()
    .then((data) =>{
        var targetDate=new Date();
        data.supplierDoDate.setDate(targetDate.getDate() + 70);
        createdDO3=data;
        deliveryOrderManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdId3 = id;
            deliveryOrderManager.getSingleById(id)
                .then(_do => {
                    createdDO3 = _do;
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
    });
});

var createdId4;
var createdDO4;
it("#03. should success when create new data", function (done) {
    deliveryOrderDataUtil.getNewData()
    .then((data) =>{
        var targetDate=new Date();
        data.supplierDoDate.setDate(targetDate.getDate() + 100);
        createdDO4=data;
        deliveryOrderManager.create(data)
        .then((id) => {
            id.should.be.Object();
            createdId4 = id;
            deliveryOrderManager.getSingleById(id)
                .then(_do => {
                    createdDO4 = _do;
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
    });
});
it('#04. should success when get data with Start Date and Duration 0-30 days', function (done) {
    var query = {};
    query.dateFrom = new Date();
    query.duration = "0-30 hari";

    purchaseOrderManager.getDurationPOEksDoData(query)
        .then(result => {
            var po = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#05. should success when get data with Start Date, End Date and Duration 31-60 days', function (done) {
    var query = {};
    query.dateFrom = new Date();
    query.dateTo = createdDO3.date;
    query.duration = "31-60 hari";

    purchaseOrderManager.getDurationPOEksDoData(query)
        .then(result => {
            var po = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#05. should success when get data with Start Date, End Date and Duration 61-90 days', function (done) {
    var query = {};
    query.dateFrom = new Date();
    query.dateTo = createdDO3.supplierDoDate;
    query.duration = "61-90 hari";

    purchaseOrderManager.getDurationPOEksDoData(query)
        .then(result => {
            var po = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

var resultForExcelTest = {};
it('#06. should success when get data with Start Date, End Date and Duration >90 days', function (done) {
    var query = {};
    query.dateFrom = new Date();
    query.dateTo = createdDO3.supplierDoDate;
    query.duration = "> 90 hari";

    purchaseOrderManager.getDurationPOEksDoData(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});

it('#07. should success when get data for Excel Report', function (done) {
    var query = {};
    query.duration = "0-30 hari";

    purchaseOrderManager.getXls(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#08. should success when get data for Excel Report using dateFrom only', function (done) {
    var query = {};
    query.dateFrom = new Date();
    query.duration = "0-30 hari";

    purchaseOrderManager.getXlsDurationPOEksDoData(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#09. should success when get data for Excel Report using dateTo only', function (done) {
    var query = {};
    query.dateTo = new Date();
    query.duration = "> 90 hari";

    purchaseOrderManager.getXlsDurationPOEksDoData(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#10. should success when get data for Excel Report using both dateFrom and dateTo', function (done) {
    var query = {};
    query.dateFrom = new Date();
    query.dateTo = createdDO3.supplierDoDate;
    query.duration = "> 90 hari";

    purchaseOrderManager.getXlsDurationPOEksDoData(resultForExcelTest, query)
        .then(xlsData => {             
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});

it('#11. should success when get data with unit and Duration >90 days', function (done) {
    var query = {};
    query.unitId=createdDO3.purchaseRequest.unit._id;
    query.duration = "> 90 hari";

    purchaseOrderManager.getDurationPOEksDoData(query)
        .then(result => {
            var po = result;
            resultForExcelTest.info = result;
            po.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });
});