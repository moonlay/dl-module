require("should");
var dataUtil = require("../../data-util/sales/production-order-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.productionOrder;
var codeGenerator = require('../../../src/utils/code-generator');
var processTypeDataUtil = require("../../data-util/master/process-type-data-util");
var orderTypeDataUtil = require("../../data-util/master/order-type-data-util");
var ProductionOrderManager= require("../../../src/managers/sales/production-order-manager");
var manager;
var OrderTypeManager= require("../../../src/managers/master/order-type-manager");
var managerOrderType;
var ProcessTypeManager= require("../../../src/managers/master/process-type-manager");
var managerProcessType;

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            manager = new ProductionOrderManager(db, {
                username: 'dev'
            });

            managerOrderType = new OrderTypeManager(db, {
                username: 'dev'
            });

            managerProcessType = new ProcessTypeManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should error when create with empty data", function(done) {
        manager.create({})
            .then((id) => {
                done("Should not be able to create with empty data");
            })
            .catch((e) => {
                try {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    done();
                }
                catch (ex) {
                    done(e);
                }
            });
    });

var createdDataOrderType;
var createdDataOrderTypeId;
it("#02. should success when create new order type data printing", function(done) {
    orderTypeDataUtil.getNewData()
    .then((data) =>{
        data.name="Printing";
        createdDataOrderType=data;
        managerOrderType.create(data)
        .then((id) => {
            id.should.be.Object();
            createdDataOrderTypeId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
    });
});
var createdDataProcessType;
var createdDataProcessTypeId;
it("#03. should success when create new process type data printing", function(done) {
    processTypeDataUtil.getNewData()
    .then((data) =>{
        data.orderTypeId=createdDataOrderTypeId;
        data.orderType=createdDataOrderType;
        data.name="OP";
        createdDataProcessType=data;
        managerProcessType.create(data)
        .then((id) => {
            id.should.be.Object();
            createdDataProcessTypeId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
    });
});

var createdId;
var createdData;
it("#04. should success when create new data", function(done) {
        dataUtil.getNewData()
            .then((data) =>{
                data.processType=createdDataProcessType;
                data.processTypeId=createdDataProcessTypeId;
                data.orderType=createdDataOrderType;
                data.orderTypeId=createdDataOrderTypeId;
                data.RUN="2 RUN";
                data.RUNWidth=[10,20];
                data.designNumber="No.1/01/17";
                data.designCode="DSGCD01";
                manager.create(data)
            .then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
            })
            .catch((e) => {
                done(e);
            });
    });
});

it("#05. should error when create new data without RUN,RUNWidth,designNumber,designCode", function(done) {
        dataUtil.getNewData()
            .then((data) =>{
                data.processType=createdDataProcessType;
                data.processTypeId=createdDataProcessTypeId;
                data.orderType=createdDataOrderType;
                data.orderTypeId=createdDataOrderTypeId;
                manager.create(data)
                .then((id) => {
                    done("Should not be able to create with empty data");
                })
                .catch((e) => {
                    try {
                        e.name.should.equal("ValidationError");
                        e.should.have.property("errors");
                        e.errors.should.instanceof(Object);
                        done();
                    }
                    catch (ex) {
                        done(e);
                    }
                });
            });
    });

    it("#06. should success when destroy data processType with id", function(done) {
        managerProcessType.destroy(createdDataProcessTypeId)
            .then((result) => {
                result.should.be.Boolean();
                result.should.equal(true);
                done();
            })
            .catch((e) => {
                done(e);
            });
    });

    it("#07. should success when destroy data orderType with id", function(done) {
        managerOrderType.destroy(createdDataOrderTypeId)
            .then((result) => {
                result.should.be.Boolean();
                result.should.equal(true);
                done();
            })
            .catch((e) => {
                done(e);
            });
    });

    it("#08. should success when destroy data production Order with id", function(done) {
        manager.destroy(createdId)
            .then((result) => {
                result.should.be.Boolean();
                result.should.equal(true);
                done();
            })
            .catch((e) => {
                done(e);
            });
    });