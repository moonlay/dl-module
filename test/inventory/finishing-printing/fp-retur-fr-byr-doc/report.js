require("should");
var DataUtil = require("../../../data-util/inventory/finishing-printing/fp-retur-fr-byr-doc-data-util");
var helper = require("../../../helper");
var validate = require("dl-models").validator.inventory.finishingPrinting.fpReturFromBuyerDoc;
var moment = require('moment');

var Manager = require("../../../../src/managers/inventory/finishing-printing/fp-retur-fr-byr-doc-manager");
var instanceManager = null;
var dateNow;
var dateAfter;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            instanceManager = new Manager(db, {
                username: 'dev'
            });
            dateNow = new Date();
            dateAfter = new Date();
            dateAfter = dateAfter.setDate(dateAfter.getDate() + 2);
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId;
it("#01. should success when create new data", function (done) {
    DataUtil.getNewData()
        .then((data) => instanceManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdData;
it(`#02. should success when get created data with id`, function (done) {
    instanceManager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            validate(data);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success get report without filter", function (done) {
    instanceManager.getReportMonitoring({})
        .then((data) => {
            data.should.instanceof(Object);
            data.should.have.property("data");
            data.should.have.property("count");
            data.should.have.property("size");
            data.should.have.property("total");
            data.should.have.property("page");
            data.data.should.instanceof(Array);
            instanceManager.getXls(data)
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property("data");
                    xls.should.have.property("options");
                    xls.should.have.property("name");
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should success get report with filter Retur No", function (done) {
    instanceManager.getReportMonitoring({filter : {code : createdData.code}}, false)
        .then((data) => {
            data.should.instanceof(Object);
            data.should.have.property("data");
            data.should.have.property("count");
            data.should.have.property("size");
            data.should.have.property("total");
            data.should.have.property("page");
            data.data.should.instanceof(Array);
            instanceManager.getXls(data)
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property("data");
                    xls.should.have.property("options");
                    xls.should.have.property("name");
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should success get report with filter destination", function (done) {
    instanceManager.getReportMonitoring({filter : {destination : createdData.destination}}, false)
        .then((data) => {
            data.should.instanceof(Object);
            data.should.have.property("data");
            data.should.have.property("count");
            data.should.have.property("size");
            data.should.have.property("total");
            data.should.have.property("page");
            data.data.should.instanceof(Array);
            instanceManager.getXls(data)
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property("data");
                    xls.should.have.property("options");
                    xls.should.have.property("name");
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should success get report with filter buyer", function (done) {
    instanceManager.getReportMonitoring({filter : {buyer : createdData.buyer.code}}, false)
        .then((data) => {
            data.should.instanceof(Object);
            data.should.have.property("data");
            data.should.have.property("count");
            data.should.have.property("size");
            data.should.have.property("total");
            data.should.have.property("page");
            data.data.should.instanceof(Array);
            instanceManager.getXls(data)
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property("data");
                    xls.should.have.property("options");
                    xls.should.have.property("name");
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#07. should success get report with filter production order No", function (done) {
    instanceManager.getReportMonitoring({filter : {productionOrderNo : createdData.details[0].productionOrderNo}}, false)
        .then((data) => {
            data.should.instanceof(Object);
            data.should.have.property("data");
            data.should.have.property("count");
            data.should.have.property("size");
            data.should.have.property("total");
            data.should.have.property("page");
            data.data.should.instanceof(Array);
            instanceManager.getXls(data)
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property("data");
                    xls.should.have.property("options");
                    xls.should.have.property("name");
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#08. should success get report with filter date From", function (done) {
    instanceManager.getReportMonitoring({filter : {dateFrom : dateAfter}}, false)
        .then((data) => {
            data.should.instanceof(Object);
            data.should.have.property("data");
            data.should.have.property("count");
            data.should.have.property("size");
            data.should.have.property("total");
            data.should.have.property("page");
            data.data.should.instanceof(Array);
            instanceManager.getXls(data)
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property("data");
                    xls.should.have.property("options");
                    xls.should.have.property("name");
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#09. should success get report with filter date To", function (done) {
    instanceManager.getReportMonitoring({filter : {dateTo : dateNow}}, false)
        .then((data) => {
            data.should.instanceof(Object);
            data.should.have.property("data");
            data.should.have.property("count");
            data.should.have.property("size");
            data.should.have.property("total");
            data.should.have.property("page");
            data.data.should.instanceof(Array);
            instanceManager.getXls(data)
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property("data");
                    xls.should.have.property("options");
                    xls.should.have.property("name");
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#10. should success get report with filter date From and date To", function (done) {
    instanceManager.getReportMonitoring({filter : {dateFrom : dateAfter, dateTo : dateNow}}, false)
        .then((data) => {
            data.should.instanceof(Object);
            data.should.have.property("data");
            data.should.have.property("count");
            data.should.have.property("size");
            data.should.have.property("total");
            data.should.have.property("page");
            data.data.should.instanceof(Array);
            instanceManager.getXls(data)
                .then(xls => {
                    xls.should.instanceof(Object);
                    xls.should.have.property("data");
                    xls.should.have.property("options");
                    xls.should.have.property("name");
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});