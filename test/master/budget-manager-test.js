
var helper = require("../helper");
var BudgetManager = require("../../src/managers/master/budget-manager");
var instanceManager = null;
var validator = require('dl-models').validator.budget;

require("should");

function getData() {
    var Budget = require('dl-models').master.Budget;
    var budget = new Budget();

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    budget.code = code;
    budget.name = `name[${code}]`;
    
    return budget;
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            instanceManager = new BudgetManager(db, {
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