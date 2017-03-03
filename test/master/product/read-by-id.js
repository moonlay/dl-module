'use strict';
var should = require('should');
var helper = require("../../helper");
var ProductManager = require("../../../src/managers/master/product-manager");
var productManager = null;
var dataUtil = require("../../data-util/master/product-data-util");
var validate = require("dl-models").validator.master.product;
var ObjectId = require("mongodb").ObjectId;

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


var createdIds = [];
it(`#01. should success when get created new data 1`, function (done) {
    dataUtil.getNewData()
        .then((data) => productManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdIds.push(id);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
it(`#02. should success when get created new data 2`, function (done) {
    dataUtil.getNewData()
        .then((data) => productManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdIds.push(id);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#02. should success when get product by id`, function (done) {
    var query = {};
    var jobs = [];

    for (var createdId of createdIds) {
        jobs.push({ "_id": new ObjectId(createdId) });
    }

    var filter = {};

    if (jobs.length === 1) {
        filter = jobs[0];
        query.filter = filter;
    } else if (jobs.length > 1) {
        filter = { '$or': jobs };
        query.filter = filter;
    }
    productManager.readById(query).then(
        products => {
            products.should.instanceof(Object);
            products.data.should.instanceof(Array);
            products.data.length.should.equal(2);
            done();
        }).catch(e => {
            done(e);
        });
});