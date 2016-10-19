'use strict';

var should = require('should');
var helper = require("../helper");
var assert = require('assert');
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var PurchaseRequestManager = require("../../src/managers/purchasing/purchase-request-manager");
var UnitManager = require("../../src/managers/master/unit-manager");
var CategoryManager = require("../../src/managers/master/category-manager");
var ProductManager = require("../../src/managers/master/product-manager");
var UomManager = require("../../src/managers/master/uom-manager");
var BudgetManager = require("../../src/managers/master/budget-manager");
var purchaseRequestManager = null;
var unitManager = null;
var categoryManager = null;
var productManager = null;
var uomManager = null;
var budgetManager = null;

function getData() {
    var PurchaseRequest = require('dl-models').purchasing.PurchaseRequest;
    var PurchaseRequestItem = require('dl-models').purchasing.PurchaseRequestItem;

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    
    var purchaseRequest = new PurchaseRequest();
        purchaseRequest.no = '1' + code + stamp;
        purchaseRequest.date = new Date();
        purchaseRequest.expectedDeliveryDate = new Date();
        purchaseRequest.remark = `remark [${code}]`;

    return purchaseRequest;
}

function getDataPurchaseRequestItem() {
    var PurchaseRequest = require('dl-models').purchasing.PurchaseRequest;
    var PurchaseRequestItem = require('dl-models').purchasing.PurchaseRequestItem;

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    
    var purchaseRequestItem = new PurchaseRequestItem();
        purchaseRequestItem.remark= 'test desc';
        purchaseRequestItem.quantity= 1000;

    var _purchaseRequestItems = [];
    _purchaseRequestItems.push(purchaseRequestItem);
    
    return _purchaseRequestItems;
}

function getDataProduct() {
    var Product = require('dl-models').master.Product;
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    var product = new Product();
    product.code = code;
    product.name = `name[${code}]`;
    product.price = 50;
    product.description = `description for ${code}`;
    product.tags = `tags for ${code}`;
    product.properties = [];

    return product;
}

function getDataUom() {
    var Uom = require('dl-models').master.Uom;
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    var uom = new Uom();
    uom.unit= `Satuan [${code}]`;
    return uom;
}

function getDataCategory() {
    var Category = require('dl-models').master.Category;
    var category = new Category();

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    category.code = code;
    category.name = `name[${code}]`;
    category.codeRequirement = `codeRequirement[${code}]`;
    return category;
}

function getDataUnit() {
    var Unit = require('dl-models').master.Unit;
    var unit = new Unit();

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    unit.code = code;
    unit.division = `division[${code}]`;
    unit.subDivision = `subdivison [${code}]`; 
    unit.description = `desc[${code}]`;
    return unit;
}

function getDataBudget() {
    var Budget = require('dl-models').master.Budget;
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    var budget = new Budget();
    Budget.code= `CodeBudget [${code}]`;
    Budget.name= `Budget [${code}]`;
    return budget;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseRequestManager = new PurchaseRequestManager(db, {
                username: 'unit-test'
            });
            
            unitManager = new UnitManager(db, {
                username: 'unit-test'
            });
            
            categoryManager = new CategoryManager(db, {
                username: 'unit-test'
            });
            
            productManager = new ProductManager(db, {
                username: 'unit-test'
            });
            
            uomManager = new UomManager(db, {
                username: 'unit-test'
            });

            budgetManager = new BudgetManager(db, {
                username: 'unit-test'
            });
            
            done();
        })
        .catch(e => {
            done(e);
        })
});

var unitId;
it('#01. should success when create new data unit', function (done) {
    var data = getDataUnit();
    unitManager.create(data)
        .then(id => {
            id.should.be.Object();
            unitId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var unit;
it(`#02. should success when get created data unit with id`, function (done) {
    unitManager.getSingleByQuery({ _id: unitId })
        .then(data => {
            validator.unit(data);
            data.should.instanceof(Object);
            unit = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var categoryId;
it('#03. should success when create new data category', function (done) {
    var data = getDataCategory();
    categoryManager.create(data)
        .then(id => {
            id.should.be.Object();
            categoryId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var category;
it(`#04. should success when get created data category with id`, function (done) {
    categoryManager.getSingleByQuery({ _id: categoryId })
        .then(data => {
            validator.category(data);
            data.should.instanceof(Object);
            category = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var uomId;
it('#05. should success when create new data uom', function (done) {
    var data = getDataUom();
    uomManager.create(data)
        .then(id => {
            id.should.be.Object();
            uomId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var uom;
it(`#06. should success when get created data uom with id`, function (done) {
    uomManager.getSingleByQuery({ _id: uomId })
        .then(data => {
            validator.uom(data);
            data.should.instanceof(Object);
            uom = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var productId;
it('#07. should success when create new data product', function (done) {
    var data = getDataProduct();
    data.uom=uom;
    data.uomId=uom._id;
    productManager.create(data)
        .then(id => {
            id.should.be.Object();
            productId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var product;
it(`#08. should success when get created data product with id`, function (done) {
    productManager.getSingleByQuery({ _id: productId })
        .then(data => {
            validator.product(data);
            data.should.instanceof(Object);
            product = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#09. should success when read data', function (done) {
    purchaseRequestManager.read()
        .then(documents => {
            documents.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});


var purchaseRequestId;
it('#10. should success when create new data purchase request', function (done) {
    var data = getData();
    var purchaseRequestItems = getDataPurchaseRequestItem();
    for(var purchaseRequestItem of purchaseRequestItems){
        purchaseRequestItem.uom=uom;
        purchaseRequestItem.product= product;
    }
    
    var _purchaseRequestItems = [];
    _purchaseRequestItems.push(purchaseRequestItem);
    
    data.items = _purchaseRequestItems;
    data.unit=unit;
    data.category=category;
    data.unitId=unit._id;
    data.categoryId=category._id;

    purchaseRequestManager.create(data)
        .then(id => {
            id.should.be.Object();
            purchaseRequestId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var purchaseRequest;
it(`#11. should success when get created data purchase request with id`, function (done) {
    purchaseRequestManager.getSingleByQuery({ _id: purchaseRequestId })
        .then(data => {
            validatorPurchasing.purchaseRequest(data);
            data.should.instanceof(Object);
            purchaseRequest = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#12. should success when update created data purchase request`, function (done) {
    purchaseRequest.remark += '[updated]';
    purchaseRequestManager.update(purchaseRequest)
        .then(id => {
            purchaseRequestId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#13. should success when get updated data purchase request with id`, function (done) {
    purchaseRequestManager.getSingleByQuery({ _id: purchaseRequestId })
        .then(data => {
            data.no.should.equal(purchaseRequest.no);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#14. should success when delete data purchase request`, function (done) {
    purchaseRequestManager.delete(purchaseRequest)
        .then(id => {
            purchaseRequestId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#15. should _deleted=true`, function (done) {
    purchaseRequestManager.getSingleByQuery({ _id: purchaseRequestId })
        .then(data => {
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});