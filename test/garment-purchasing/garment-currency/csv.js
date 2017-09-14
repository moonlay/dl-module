require("should");
var dataUtil = require("../../data-util/garment-purchasing/garment-currency-data-util");
var helper = require("../../helper");
// var validate = require("dl-models").validator.garmentPurchasing.garmentPurchaseOrder;
var moment = require('moment');

var Manager = require("../../../src/managers/garment-purchasing/garment-currency-manager");
var manager = null;


before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdData = {};
it("#01. should success when create data csv", function (done) {
    dataUtil.getNewDataTest()
        .then((data) => {
            data.should.instanceof(Array);
            data.length.should.not.equal(0);
            createdData.data = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#02. should error when insert empty data', function (done) {
    var testData = createdData;
    testData.data[1][0] = "";
    testData.data[1][1] = "";
    testData.data[2][0] = "TEST";
    testData.data[2][1] = "9,123";
    testData.data[3][0] = "TEST";
    testData.data[3][1] = "test";

    manager.insert(testData)
        .then(dataError => {
            dataError.should.instanceof(Array);
            dataError.length.should.not.equal(0);
            done()
        })
        .catch(e => {
            done(e);
        });
});

it('#03. should success when insert csv', function (done) {
    manager.insert(createdData)
        .then(result => {
            result.should.instanceof(Array);
            result.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});

