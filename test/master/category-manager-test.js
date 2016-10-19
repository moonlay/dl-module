
var helper = require("../helper");
var CategoryManager = require("../../src/managers/master/category-manager");
var instanceManager = null;
var validator = require('dl-models').validator.category;

require("should");

function getData() {
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

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new CategoryManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

var createdId;
it('#01. should success when create new data', function (done) {
    var data = getData();
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#02. should error when create new data', function (done) {
    var data = {};
    instanceManager.create(data)
        .then(id => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch(e => {
            e.errors.should.have.property('name'); 
            done();
        })
});