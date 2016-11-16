var helper = require("../helper");
var UsterClassificationManager = require("../../src/managers/master/uster-classification-manager");
var ProductManager = require("../../src/managers/master/Product-manager");
var UomUtil = require('../data-util/master/uom-data-util');
var Product = require('dl-models').master.Product;
var validator = require('dl-models').validator.master;
var instanceManager = null;
var instanceManagerProduct = null;
require("should");

function getDataProduct(){
    return Promise.resolve(UomUtil.getTestData())
        .then(uom => {
            var Product = require('dl-models').master.Product;
            var now = new Date();
            var stamp = now / 1000 | 0;
            var code = stamp.toString(36);

            var product = new Product();
            product.code = code;
            product.name = `name[${code}]`;
            product.price = 50;
            product.description = `description for ${code}`;
            product.tags = `Benang Spinning ${code}`;
            product.properties = [];
            product.uom = uom;
            product.uomId = uom._id;

            return product;
        });
}

function getData() {
            var UsterClassification = require('dl-models').master.UsterClassification;
            var usterClassification = new UsterClassification();

            var now = new Date();
            var stamp = now / 1000 | 0;
            var code = stamp.toString(36);
            
            usterClassification.thin = 1;
            usterClassification.thick = 1;
            usterClassification.neps = 1;
            usterClassification.ipi = usterClassification.thin + usterClassification.thick + usterClassification.neps;
            usterClassification.grade = 'Good';

            return usterClassification;
}

function getNewData() {
    var UsterClassification = require('dl-models').master.UsterClassification;
    var usterClassification = new UsterClassification();
    
    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);
    
    usterClassification.threadName = product.name;
    usterClassification.productId = product._id;
    usterClassification.thread = product;
    usterClassification.thin = 1;
    usterClassification.thick = 1;
    usterClassification.neps = 1;
    usterClassification.ipi = usterClassification.thin + usterClassification.thick + usterClassification.neps;
    usterClassification.grade = 'Good';
    return usterClassification;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new UsterClassificationManager(db, {
                username: 'unit-test'
            });
            instanceManagerProduct = new ProductManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var productId;
it('#01. should success when create new data product', function (done) {
    getDataProduct().then(data => {
        instanceManagerProduct.create(data)
            .then(id => {
                id.should.be.Object();
                productId = id;
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

var product;
it(`#02. should success when get created data product with id`, function (done) {
    instanceManagerProduct.getSingleByQuery({ _id: productId })
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

it('#03. should success when read data', function (done) {
    instanceManager.read()
        .then(documents => {
            //process documents
            documents.data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;
it('#04. should success when create new data uster classification', function (done) {
    var data = getData();
    data.thread = product;
    data.productId = product._id;
    data.threadName = product.name;
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdData;
it(`#05. should success when get created data with id`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validator.usterClassification(data);
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#06. should error when create new data uster classification with same product and grade', function (done) {
    var data = getNewData();
    data.grade = createdData.grade;
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done("Should not be able to create data with same product and grade");
        })
        .catch(e => {
            e.errors.should.have.property('thread');
            done();
        })
});

it(`#07. should success when update created data`, function (done) {

    createdData.thin += 1;
    createdData.thick += 1;
    createdData.neps += 1;
    createdData.ipi = createdData.thin + createdData.thick + createdData.neps;
    createdData.grade += '[updated]';

    instanceManager.update(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#08. should success when get updated data with id`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validator.usterClassification(data);
            data.thin.should.equal(createdData.thin);
            data.thick.should.equal(createdData.thick);
            data.neps.should.equal(createdData.neps);
            data.ipi.should.equal(createdData.ipi);
            data.grade.should.equal(createdData.grade);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#09. should success when delete data`, function (done) {
    instanceManager.delete(createdData)
        .then(id => {
            createdId.toString().should.equal(id.toString());
            done();
        })
        .catch(e => {
            done(e);
        });
});

it(`#10. should _deleted=true`, function (done) {
    instanceManager.getSingleByQuery({ _id: createdId })
        .then(data => {
            validator.usterClassification(data);
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        })
});

it(`#11. should success when get thread name in uster`, function (done) {
    var query = {};
    instanceManager.getProductInUster(query)
        .then(product => {
            if(product.length > 0){
                for(var a of product)
                    a.should.be.String();
            }
            done();
        })
        .catch(e => {
            done(e);
        })
});