require("should");
var dataUtil = require("../../data-util/sales/production-order-data-util");
var fpSCdataUtil = require("../../data-util/sales/finishing-printing-sales-contract-data-util");
var processTypeDataUtil = require("../../data-util/master/process-type-data-util");
var buyerDataUtil = require("../../data-util/master/buyer-data-util");
var accountDataUtil = require("../../data-util/auth/account-data-util");
var dailyOperationUtil = require("../../data-util/production/finishing-printing/daily-operation-data-util");
var fabricQualityControlUtil = require("../../data-util/production/finishing-printing/fabric-quality-control-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator;
var codeGenerator = require('../../../src/utils/code-generator');

var ProcessTypeManager = require("../../../src/managers/master/process-type-manager");
var fpSCManager = require("../../../src/managers/sales/finishing-printing-sales-contract-manager");
var BuyerManager = require("../../../src/managers/master/buyer-manager");
var AccountManager = require("../../../src/managers/auth/account-manager");
var ProductionOrderManager = require("../../../src/managers/sales/production-order-manager");
var manager = null;
var processTypeManager = null;
var buyerManager = null;
var accountManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new ProductionOrderManager(db, { username: 'dev' });
            processTypeManager = new ProcessTypeManager(db, { username: 'dev' });
            buyerManager = new BuyerManager(db, { username: 'dev' });
            accountManager = new AccountManager(db, { username: 'dev' });
            fpSCManager = new fpSCManager(db, { username: 'dev' });
            done();
        })
        .catch(e => {
            done(e);
        });
});
var dataBuyer1;
var dataBuyer2;
var dataProcessType1;
var dataProcessType2;
var dataAccount1;
var dataAccount2;
var fpSC;

it("#01. should success when create new support data (buyer, account, process type)", function (done) {
    var processType1 = processTypeDataUtil.getNewData();
    var buyer1 = buyerDataUtil.getNewData();
    var account1 = accountDataUtil.getNewData();
    Promise.all([processType1, buyer1, account1])
        .then(data1 => {
            var processType2 = processTypeDataUtil.getNewData();
            var buyer2 = buyerDataUtil.getNewData();
            var account2 = accountDataUtil.getNewData();
            Promise.all([processType2, buyer2, account2])
                .then(data2 => {
                    Promise.all([processTypeManager.create(data1[0]), processTypeManager.create(data2[0]), buyerManager.create(data1[1]), buyerManager.create(data2[1]), accountManager.create(data1[2]), accountManager.create(data2[2])])
                        .then(id => {
                            Promise.all([processTypeManager.getSingleById(id[0]), processTypeManager.getSingleById(id[1]), buyerManager.getSingleById(id[2]), buyerManager.getSingleById(id[3]), accountManager.getSingleById(id[4]), accountManager.getSingleById(id[5])])
                                .then(results => {
                                    validate.master.processType(results[0]);
                                    dataProcessType1 = results[0];
                                    validate.master.processType(results[1]);
                                    dataProcessType2 = results[1];
                                    validate.master.buyer(results[2]);
                                    dataBuyer1 = results[2];
                                    validate.master.buyer(results[3]);
                                    dataBuyer2 = results[3];
                                    validate.auth.account(results[4]);
                                    dataAccount1 = results[4];
                                    validate.auth.account(results[5]);
                                    dataAccount2 = results[5];
                                    done();
                                })
                                .catch(e => {
                                    done(e);
                                });
                        })
                        .catch(e => {
                            done(e);
                        });
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

var createdSCId;
var createdSCdata;
it("#01.5. should success when create SalesContract", function (done) {
    fpSCdataUtil.getNewData()
        .then((data) => {
            createdSCdata = data;
            fpSCManager.create(data)
                .then((id) => {
                    return fpSCManager.getSingleById(id);
                })
                .then(sc => {
                    createdSCdata = sc;
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });
})

it("#02. should success when delete all exist data production order", function (done) {
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

it("#03. should success get all data Production Order (0 data) when searh report without parameter", function (done) {
    var query = {
        page: 1,
        size: 20,
        header: "application/json",
        filter: {}
    };
    manager.getReport(query)
        .then(docs => {
            var data = docs.data;
            console.log(data);
            data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

var scId = [];
var selesContractNo;
var orderNo;
it("#04. should success when create new 10 data Production Order with 2 detail color in each data production order", function (done) {
    var dataReport = [];
    for (var a = 0; a < 5; a++) {
        var data = dataUtil.getNewData({ buyer: dataBuyer1, process: dataProcessType1, account: dataAccount1, salesContract: createdSCdata });
        dataReport.push(data);
    }
    for (var a = 0; a < 5; a++) {
        var data = dataUtil.getNewData({ buyer: dataBuyer2, process: dataProcessType2, account: dataAccount2, salesContract: createdSCdata });
        dataReport.push(data);
    }
    Promise.all(dataReport)
        .then(dataResults => {
            var createData = [];
            var numberIndex = 0;
            for (var a of dataResults) {
                numberIndex++;
                var code = codeGenerator();
                a.salesContractNo = createdSCdata.salesContractNo;
                a.salesContractId = createdSCdata._id;
                a.orderNo = `${code}${numberIndex}`;
                var dataProdOrder = manager.create(a);
                createData.push(dataProdOrder);
                salesContractNo = a.salesContractNo;
                orderNo = a.orderNo;
            }
            Promise.all(createData)
                .then(created => {
                    scId = created;
                    done();
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

it("#05. should success get all data Production Order when searh report without parameter", function (done) {
    var query = {
        page: 1,
        size: 20,
        header: "application/json",
        filter: {}
    };
    manager.getReport(query)
        .then(docs => {
            var data = docs.data;
            data.should.be.instanceof(Array);
            data.length.should.equal(20);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#06. should success get all data Production Order (2 data) when searh report with Sales Contract No parameter", function (done) {
    var query = {
        page: 1,
        size: 20,
        header: "application/json",
        filter: { salesContractNo: salesContractNo }
    };
    manager.getReport(query)
        .then(docs => {
            var data = docs.data;
            data.should.be.instanceof(Array);
            data.length.should.equal(20);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#07. should success get all data Production Order (2 data) when searh report with Order No parameter", function (done) {
    var query = {
        page: 1,
        size: 20,
        header: "application/json",
        orderNo: orderNo
    };
    manager.getReport(query)
        .then(docs => {
            var data = docs.data;
            data.should.be.instanceof(Array);
            data.length.should.equal(2);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#08. should success get all data Production Order (20 data) when searh report with Order Type parameter", function (done) {
    var query = {
        page: 1,
        size: 20,
        header: "application/json",
        orderTypeId: dataProcessType1.orderTypeId
    };
    manager.getReport(query)
        .then(docs => {
            var data = docs.data;
            data.should.be.instanceof(Array);
            data.length.should.equal(20);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#09. should success get all data Production Order (10 data) when searh report with Process Type parameter", function (done) {
    var query = {
        page: 1,
        size: 20,
        header: "application/json",
        processTypeId: dataProcessType1._id
    };
    manager.getReport(query)
        .then(docs => {
            var data1 = docs.data;
            data1.should.be.instanceof(Array);
            data1.length.should.equal(10);
            manager.getReport({ processTypeId: dataProcessType2._id })
                .then(docs => {
                    var data2 = docs.data;
                    data2.should.be.instanceof(Array);
                    // data2.length.should.equal(10);
                    done();
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

it("#10. should success get all data Production Order (10 data) when searh report with buyer parameter", function (done) {
    var query = {
        page: 1,
        size: 20,
        header: "application/json",
        buyerId: dataBuyer1._id
    };
    manager.getReport(query)
        .then(docs => {
            var data1 = docs.data;
            data1.should.be.instanceof(Array);
            data1.length.should.equal(10);
            manager.getReport({ buyerId: dataBuyer2._id })
                .then(docs => {
                    var data2 = docs.data;
                    data2.should.be.instanceof(Array);
                    // data2.length.should.equal(10);
                    done();
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

it("#11. should success get all data Production Order (10 data) when searh report with account parameter", function (done) {
    var query = {
        page: 1,
        size: 20,
        header: "application/json",
        accountId: dataAccount1._id
    };
    manager.getReport(query)
        .then(docs => {
            var data1 = docs.data;
            data1.should.be.instanceof(Array);
            data1.length.should.equal(10);
            manager.getReport({ accountId: dataAccount2._id })
                .then(docs => {
                    var data2 = docs.data;
                    data2.should.be.instanceof(Array);
                    // data2.length.should.equal(10);
                    done();
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

it("#12. should success get all data Sales Monthly when searh report with No parameter", function (done) {
    var query = {
        header: "application/json",
        orderNo: orderNo
    };
    manager.getSalesMonthlyReport(query)
        .then(docs => {
            var data = docs.data;
            data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#13. should success get all data Sales Monthly when searh report with Account parameter", function (done) {
    var query = {
        header: "application/json",
        accountId: dataAccount1._id
    };
    manager.getSalesMonthlyReport(query)
        .then(docs => {
            var data = docs.data;
            data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#14. should success get all data Sales Monthly when searh report with Order Type parameter", function (done) {
    var query = {
        header: "application/json",
        orderTypeId: dataProcessType1.orderTypeId
    };
    manager.getSalesMonthlyReport(query)
        .then(docs => {
            var data = docs.data;
            data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#15. should success when destroy all data Production Order", function (done) {
    var destroyData = [];
    for (var id of scId) {
        var data = manager.destroy(id);
        destroyData.push(data);
    }
    Promise.all(destroyData)
        .then(results => {
            results.should.be.instanceof(Array);
            for (var result of results)
                result.should.equal(true);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#16. should success when create daily operation", function (done) {
    var data = dailyOperationUtil.getNewTestData("input");
    Promise.all([data])
        .then(results => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#17. should success get all data Production Order when search report without parameter", function (done) {
    var query = {
        page: 1,
        size: 20,
        header: "application/json",
        filter: {}
    };
    manager.getReport(query)
        .then(docs => {
            var data = docs.data;
            data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#18. should success get all data Production Order when search report without parameter (header : application/xls)", function (done) {
    var query = {
        page: 1,
        size: 20,
        header: "application/xls",
        salesContractNo: "",
        orderNo: "",
        orderTypeId: "",
        processTypeId: "",
        buyerId: "",
        accountId: "",
        sdate: "",
        edate: "",
        filter: {}

    };
    manager.getReport(query)
        .then(docs => {
            var data = docs.data;
            data.should.be.instanceof(Array);
            done();
        })
        .catch(e => {
            done(e);
        });
});

