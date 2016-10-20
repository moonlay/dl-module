'use strict';

var should = require('should');
var helper = require("../helper");
var validator = require('dl-models').validator.master;
var validatorPurchasing = require('dl-models').validator.purchasing;
var PurchaseOrderExternalManager = require("../../src/managers/purchasing/purchase-order-external-manager");
var PurchaseOrderBaseManager = require("../../src/managers/purchasing/purchase-order-manager");
var UnitManager = require("../../src/managers/master/unit-manager");
var CategoryManager = require("../../src/managers/master/category-manager");
var ProductManager = require("../../src/managers/master/product-manager");
var UomManager = require("../../src/managers/master/uom-manager");
var SupplierManager = require("../../src/managers/master/supplier-manager");
var CurrencyManager = require("../../src/managers/master/currency-manager");
var purchaseOrderExternalManager = null;
var purchaseOrderManager = null;
var unitManager = null;
var categoryManager = null;
var productManager = null;
var uomManager = null;
var supplierManager = null;
var currencyManager = null;

function getData() {
    var PurchaseOrderExternal = require('dl-models').purchasing.PurchaseOrderExternal;
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    
    var purchaseOrderExternal = new PurchaseOrderExternal();
        purchaseOrderExternal.freightCostBy = "Pembeli";
        purchaseOrderExternal.paymentMethod = "CASH";
        purchaseOrderExternal.useVat = true;
        purchaseOrderExternal.useIncomeTax = true;
        purchaseOrderExternal.date = new Date();
        purchaseOrderExternal.expectedDeliveryDate = new Date();
        purchaseOrderExternal.actualDeliveryDate = new Date();
        purchaseOrderExternal.remark = `remark ${code}`;
    
    return purchaseOrderExternal;
}

function getDataPurchaseOrder() {
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

function getDataSupplier() {
    var Supplier = require('dl-models').master.Supplier;
    var supplier = new Supplier();

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    supplier.code = code;
    supplier.name = `name[${code}]`;
    supplier.address = `Solo [${code}]`;
    supplier.contact = `phone[${code}]`;
    supplier.PIC=`PIC[${code}]`;
    supplier.import = true;
    supplier.NPWP=`NPWP[${code}]`;
    supplier.serialNumber=`serialNo[${code}]`;

    return supplier;
}

function getDataCurrency() {
    var Currency = require('dl-models').master.Currency;
    var currency = new Currency(); 
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    
    currency.code = code;
    currency.symbol = `symbol[${code}]`;
    currency.rate = 1; 
    currency.description = `description[${code}]`;
    return currency;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, {
                username: 'unit-test'
            });
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
            
            supplierManager = new SupplierManager(db, {
                username: 'unit-test'
            });
            
            currencyManager = new CurrencyManager(db, {
                username: 'unit-test'
            });
            
            done();
        })
        .catch(e => {
            done(e);
        })
});

// var purchaseOrderExternal;
// it(`#19. should success when get created data with id`, function (done) {
//     purchaseOrderExternalManager.pdf("57f47c1d2e1ca2003a8d0913")
//         .then(data => {
//             validatorPurchasing.purchaseOrderExternal(data);
//             data.should.instanceof(Object);
//             purchaseOrderExternal = data;
//             done();
//         })
//         .catch(e => {
//             done(e);
//         })
// });
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

var purchaseOrderId;
it('#11. should success when create new data purchase order', function (done) {
    var data = getDataPurchaseOrder();
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

var purchaseOrder;
it(`#12. should success when get created data purchase order with id`, function (done) {
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

var supplierId;
it('#13. should success when create new data supplier', function (done) {
    var data = getDataSupplier();
    supplierManager.create(data)
        .then(id => {
            id.should.be.Object();
            supplierId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var supplier;
it(`#14. should success when get created data supplier with id`, function (done) {
    supplierManager.getSingleByQuery({ _id: supplierId })
        .then(data => {
            validator.supplier(data);
            data.should.instanceof(Object);
            supplier = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var currencyId;
it('#15. should success when create new data currency', function (done) {
    var data = getDataCurrency();
    currencyManager.create(data)
        .then(id => {
            id.should.be.Object();
            currencyId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var currency;
it(`#16. should success when get created data currency with id`, function (done) {
    currencyManager.getSingleByQuery({ _id: currencyId })
        .then(data => {
            validator.currency(data);
            data.should.instanceof(Object);
            currency = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#17. should success when read data', function (done) {
    purchaseOrderExternalManager.read()
        .then(documents => {
            documents.data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});

var purchaseOrderExternalId;
it('#18. should success when create new data', function (done) {
    var data = getData();
    data.supplier=supplier;
    data.supplierId=supplierId;
    data.currency = currency;
    data.currencyRate = currency.rate;
    data.items=[];
    data.items.push(purchaseOrder);
    
    for (var poItem of data.items)
    {
        for(var item of poItem.items)
        {
            item.pricePerDealUnit=2000;
        }
    }
    purchaseOrderExternalManager.create(data)
        .then(id => {
            id.should.be.Object();
            purchaseOrderExternalId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

var purchaseOrderExternal;
it(`#19. should success when get created data with id`, function (done) {
    purchaseOrderExternalManager.getSingleByQuery({ _id: purchaseOrderExternalId })
        .then(data => {
            validatorPurchasing.purchaseOrderExternal(data);
            data.should.instanceof(Object);
            purchaseOrderExternal = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#20. should success when update created data`, function (done) {
    purchaseOrderExternal.remark += '[updated]';

    purchaseOrderExternalManager.update(purchaseOrderExternal)
        .then(id => {
            purchaseOrderExternalId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#21. should success when get updated data with id`, function (done) {
    purchaseOrderExternalManager.getSingleByQuery({ _id: purchaseOrderExternalId })
        .then(data => {
            data.no.should.equal(purchaseOrderExternal.no);

            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#22. should success when delete data`, function (done) {
    purchaseOrderExternalManager.delete(purchaseOrderExternal)
        .then(id => {
            purchaseOrderExternalId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#23. should _deleted=true`, function (done) {
    purchaseOrderExternalManager.getSingleByQuery({ _id: purchaseOrderExternalId })
        .then(data => {
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#24. should success when post`, function (done) {
    var listPurchaseOrderExternal = [];
    listPurchaseOrderExternal.push(purchaseOrderExternal);
    purchaseOrderExternalManager.post(listPurchaseOrderExternal)
        .then(data => {
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#25. should isPosted=true`, function (done) {
    purchaseOrderExternalManager.getSingleByQuery({ _id: purchaseOrderExternalId })
        .then(data => {
            data.isPosted.should.be.Boolean();
            data.isPosted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});