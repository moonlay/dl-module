'use strict';

var should = require('should');
var helper = require("../helper");
var assert = require('assert');
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var PurchaseOrderBaseManager = require("../../src/managers/purchasing/purchase-order-manager");
var UnitManager = require("../../src/managers/master/unit-manager");
var CategoryManager = require("../../src/managers/master/category-manager");
var ProductManager = require("../../src/managers/master/product-manager");
var UomManager = require("../../src/managers/master/uom-manager");
var purchaseOrderManager = null;
var unitManager = null;
var categoryManager = null;
var productManager = null;
var uomManager = null;

function getData() {
    var PurchaseOrder = require('dl-models').purchasing.PurchaseOrder;
    var PurchaseOrderItem = require('dl-models').purchasing.PurchaseOrderItem;

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    
    var purchaseOrder = new PurchaseOrder();
        purchaseOrder.purchaseRequest.no = '1' + code + stamp;
        purchaseOrder.purchaseRequest.date = new Date();
        purchaseOrder.purchaseRequest.expectedDeliveryDate = new Date();
        purchaseOrder.remark = `remark [${code}]`;

    return purchaseOrder;
}

function getDataPurchaseOrderItem() {
    var PurchaseOrder = require('dl-models').purchasing.PurchaseOrder;
    var PurchaseOrderItem = require('dl-models').purchasing.PurchaseOrderItem;

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    
    var purchaseOrderItem = new PurchaseOrderItem();
        purchaseOrderItem.price= 10000;
        purchaseOrderItem.description= 'test desc';
        purchaseOrderItem.defaultQuantity= 1000;
        purchaseOrderItem.dealQuantity= 1000;

    var _purchaseOrderItems = [];
    _purchaseOrderItems.push(purchaseOrderItem);
    
    return _purchaseOrderItems;
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

function updateForSplit(purchaseOrder) {
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    
    var newPurchaseOrder = purchaseOrder;
    newPurchaseOrder.sourcePurchaseOrder = purchaseOrder
    newPurchaseOrder.sourcePurchaseOrderId = purchaseOrder._id;
    for(var purchaseOrderItem of newPurchaseOrder.items)
    {
        purchaseOrderItem.defaultQuantity= 50;
    }
    return newPurchaseOrder;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseOrderManager = new PurchaseOrderBaseManager(db, {
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
    purchaseOrderManager.read()
        .then(documents => {
            documents.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#10. should success when read data no purchase order external ', function (done) {
    purchaseOrderManager.readUnposted()
        .then(documents => {
            documents.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});

var purchaseOrderId;
it('#11. should success when create new data purchase order', function (done) {
    var data = getData();
    var purchaseOrderItems = getDataPurchaseOrderItem();
    for(var purchaseOrderItem of purchaseOrderItems){
        purchaseOrderItem.defaultUom=uom;
        purchaseOrderItem.dealUom=uom;
        purchaseOrderItem.product= product;
    }
    
    var _purchaseOrderItems = [];
    _purchaseOrderItems.push(purchaseOrderItem);
    
    data.purchaseRequest.unit = unit;
    data.purchaseRequest.category = category;
    data.items = _purchaseOrderItems;
    
    purchaseOrderManager.create(data)
        .then(id => {
            id.should.be.Object();
            purchaseOrderId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#12. should success when split purchase order', function (done) {
    purchaseOrderManager.getSingleByQuery({ _id: purchaseOrderId })
        .then(result => {
            var data = updateForSplit(result);
            purchaseOrderManager.split(data)
                .then(id => {
                    id.should.be.Object();
                    done();
                })
                .catch(e => {
                    done(e);
                })

        })
        .catch(e => {
            done(e);
        })
});

var purchaseOrder;
it(`#13. should success when get created data purchase order with id`, function (done) {
    purchaseOrderManager.getSingleByQuery({ _id: purchaseOrderId })
        .then(data => {
            validatorPurchasing.purchaseOrder(data);
            data.should.instanceof(Object);
            purchaseOrder = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#14. should success when update created data purchase order`, function (done) {
    purchaseOrder.remark += '[updated]';
    purchaseOrderManager.update(purchaseOrder)
        .then(id => {
            purchaseOrderId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#15. should success when get updated data purchase order with id`, function (done) {
    purchaseOrderManager.getSingleByQuery({ _id: purchaseOrderId })
        .then(data => {
            data.no.should.equal(purchaseOrder.no);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#16. should success when delete data purchase order`, function (done) {
    purchaseOrderManager.delete(purchaseOrder)
        .then(id => {
            purchaseOrderId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#17. should _deleted=true`, function (done) {
    purchaseOrderManager.getSingleByQuery({ _id: purchaseOrderId })
        .then(data => {
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});