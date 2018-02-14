require("should");
const helper = require("../../helper");

const OrderStatusHistoryManager = require("../../../src/managers/sales/order-status-history-manager");
const OrderStatusHistoryDataUtil = require("../../data-util/sales/order-status-historical-data-util");
let manager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new OrderStatusHistoryManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

let testData;
it("#01. should success when create new data", function (done) {
    OrderStatusHistoryDataUtil.getNewData()
        .then((data) => { testData = data; return manager.create([data]) })
        .then((id) => {
            id.should.be.Object();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when read data", function (done) {
    manager.read([testData.productionOrderNo])
        .then((documents) => {
            documents.should.be.instanceof(Array);
            documents.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success get Data By Production Order No", function (done) {
    manager.getByProductionOrderNo(testData.productionOrderNo)
        .then((documents) => {
            documents.should.be.instanceof(Array);
            documents.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});