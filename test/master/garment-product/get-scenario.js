'use strict';

var should = require('should');
var helper = require("../../helper");
var ProductManager = require("../../../src/managers/master/garment-product-manager");
var productManager = null;
var dataUtil = require("../../data-util/master/garment-product-data-util");
var validate = require("dl-models").validator.master.product;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            productManager = new ProductManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdData;
var createdId;
it(`#01. should success when get created new data`, function (done) {
    dataUtil.getNewData()
    .then((data) => createdData=data)
            .then((data) => productManager.create(data))
            .then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
            })
            .catch((e) => {
                done(e);
            });
});

it(`#02. should success when get product by tags from created data`, function (done) {
    var key=createdData.name;
    var filter=createdData.tags;
    productManager.getProductByTags(key,filter).then(
        product => {
            product.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
    });
});

it('#03. should success when get data Kanban', function (done) {
    var query = { "keyword": "a" };
    productManager.read(query)
        .then(products => {
            products.data.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
        });

});

it(`#04. should success when destroy data with id`, function(done) {
    productManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#05. should null when get destroyed data`, function(done) {
    productManager.getSingleByIdOrDefault(createdId)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});