require("should");
var dataUtil = require("../../data-util/sales/production-order-data-util");
var dailyOperationUtil = require("../../data-util/production/finishing-printing/daily-operation-data-util");
var fabricQualityControlUtil = require("../../data-util/production/finishing-printing/fabric-quality-control-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator;
var codeGenerator = require('../../../src/utils/code-generator');

var ProductionOrderManager = require("../../../src/managers/sales/production-order-manager");
var manager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new ProductionOrderManager(db, { username: 'dev' });
            done();
        })
        .catch(e => {
            done(e);
        });
});


it("#01. should success when delete all exist data production order", function (done) {
    manager.read({ size: 100 })
        .then(results => {
            if (results.data.length === 0) {
                done();
            } else {
                var destroyData = [];
                for (var pOrder of results.data) {
                    var des = manager.destroy(pOrder._id);
                    destroyData.push(des);
                }
                if (destroyData.length === 0) {
                    done();
                } else {
                    Promise.all(destroyData)
                        .then(data => {
                            data.should.be.instanceof(Array);
                            for (var a of data)
                                a.should.equal(true);
                            done();
                        })
                        .catch(e => {
                            done(e);
                        });
                }
            }
        })
        .catch(e => {
            done(e);
        });
});

var salesContractNo;
it("#02. should success when create new data Production Order", function (done) {
    var dataReport = [];
    dataUtil.getNewTestData(false)
        .then(dataResult => {
            salesContractNo = dataResult.salesContractNo
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#03. should success when create daily operation", function (done) {
    dailyOperationUtil.getNewTestData("input")
        .then(data => {
            data.should.be.instanceof(Object);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#04. should success when create fabric quality control", function (done) {
    fabricQualityControlUtil.getNewTestData()
        .then(data => {
            data.should.be.instanceof(Object);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#05. should success get detail report", function (done) {
    manager.getDetailReport(salesContractNo)
        .then(data => {
            data.should.be.instanceof(Object);
            data.productionOrders.should.be.instanceof(Array);
            data.dailyOperations.should.be.instanceof(Array);
            data.qualityControls.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

