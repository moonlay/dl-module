require("should");
var dataUtil = require("../../../data-util/production/finishing-printing/daily-operation-data-util");
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.dailyOperation;
var codeGenerator = require('../../../../src/utils/code-generator');

var DailyOperationManager = require("../../../../src/managers/production/finishing-printing/daily-operation-manager");
var manager;

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            manager = new DailyOperationManager(db, {
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

var dataSource;
var DailyOperation;
var DailyOperationId;
it("#02. should success create data daily operation when create new data production order", function(done) {
    dataUtil.getNewData()
        //.then((data) => dataprodOrder=data)
        .then(data => {
            dataSource = data;
            DailyOperation = data;
            manager.getSingleByQueryOrDefault({
                "$and" : [{
                    "_deleted" : false
                },{
                    "productionOrder.orderNo" : data && data.productionOrder ? data.productionOrder.orderNo : ""
                },{
                    "material" : data && data.productionOrder ? data.productionOrder.material : ""
                },{
                    "construction" : data && data.productionOrder ? data.productionOrder.construction : ""
                },{
                    "color" : data && data.color ? data.color : ''
                },{
                    "colorTypeId" : data && data.colorTypeId ? data.colorTypeId : ''
                }]
            })
            .then(daily => {
                validate(daily);
                daily.productionOrder.orderNo.should.equal(DailyOperation.productionOrder.orderNo);
                daily.construction.should.equal(DailyOperation.construction);
                daily.color.should.equal(DailyOperation.color);
                daily.salesContract.should.equal(DailyOperation.salesContract);
                DailyOperationId = daily._id;
                done();
            })
            .catch((e) => {
                done(e);
            });
        });
});

it("#03. should success when create new data partition on daily operation", function(done) {
    manager.create(DailyOperation)
    .then(daily => {
        manager.getSingleByIdOrDefault(daily)
               .then(data => {
                    DailyOperation = data;
                    done();
                })
               .catch((e) => {
                   done(a);
               });
    })
    .catch((e) => {
        done(e);
    });
});

it("#04. should error when create new data with same partition on daily operation", function(done) {
    manager.create(dataSource)
    .then(daily => {
        done("should error when create new data with same partition on daily operation");
    })
    .catch((e) => {
        e.name.should.equal("ValidationError");
        e.should.have.property("errors");
        e.errors.should.instanceof(Object);
        done();
    });
});

it("#05. should success when update data partition on daily operation", function(done) {
    dataSource.input = 30;
    dataSource.badOutput = 5;
    dataSource.goodOutput = 25;
    manager.updatePartition(dataSource)
    .then(daily => {
        manager.getSingleByIdOrDefault(daily)
               .then(data => {
                    var updated;
                    for(var a of data.kanban.partitions){
                        updated = a;
                    }
                    updated.input.should.equal(dataSource.input);
                    updated.badOutput.should.equal(dataSource.badOutput);
                    updated.goodOutput.should.equal(dataSource.goodOutput);
                    DailyOperation = data;
                    done();
                })
               .catch((e) => {
                   done(a);
               });
    })
    .catch((e) => {
        done(e);
    });
});

var newData;
it("#06. should success when create new data with different partition on daily operation", function(done) {
    newData = dataSource;
    newData.no = `partition ${codeGenerator()}`;
    manager.create(newData)
    .then(daily => {
        manager.getSingleByIdOrDefault(daily)
               .then(data => {
                    data.kanban.partitions.length.should.equal(2);
                    done();
                })
               .catch((e) => {
                   done(a);
               });
    })
    .catch((e) => {
        done(e);
    });
});

it("#07. should success when delete data partition on daily operation", function(done) {
    manager.deletePartition(newData)
    .then(daily => {
        manager.getSingleByIdOrDefault(daily)
               .then(data => {
                    DailyOperation = data;
                    data.kanban.partitions.length.should.equal(1);
                    done();
                })
               .catch((e) => {
                   done(a);
               });
    })
    .catch((e) => {
        done(e);
    });
});

it("#08. should success when read data", function(done) {
    manager.read({
            filter: {
                _id: DailyOperationId
            }
        })
        .then((documents) => {
            //process documents
            documents.should.have.property("data");
            documents.data.should.be.instanceof(Array);
            documents.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#09. should success when read data with keyword", function(done) {
    var key = DailyOperation.color;
    manager.read({
            filter: {
                _id: DailyOperationId
            },
            keyword : key
        })
        .then((documents) => {
            //process documents
            documents.should.have.property("data");
            documents.data.should.be.instanceof(Array);
            documents.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#10. should success when read data partition", function(done) {
    manager.readPartition({
            filter: {
                _id: DailyOperationId
            }
        })
        .then((documents) => {
            //process documents
            documents.data.should.be.instanceof(Array);
            documents.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#11. should success when read data partition with keyword", function(done) {
    var partition;
    for(var a of DailyOperation.kanban.partitions){
        partition = a;
    }
    manager.readPartition({
            filter: {
                _id: DailyOperationId
            },
            keyword : partition.no
        })
        .then((documents) => {
            //process documents
            documents.data.should.be.instanceof(Array);
            documents.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#12. should success get no data partition when search with no parameter", function(done) {
    manager.getDataPartition({})
        .then((data) => {
            if(!data)
                done();
            else
                done("not success get 0 data partition when search with no parameter");
        })
        .catch((e) => {
            done(e);
        });
});

it("#13. should success get 1 data partition when search with parameter", function(done) {
    var data;
    for(var a of DailyOperation.kanban.partitions){
        data = a;
    }
    manager.getDataPartition({
            id : DailyOperationId,
            code : data.code,
            no : data.no,
            machineId : data.machineId
        })
        .then((result) => {
            result.should.instanceof(Object);
            result.productionOrder.orderNo.should.equal(DailyOperation.productionOrder.orderNo);
            result.no.should.equal(data.no);
            result.machine.name.should.equal(data.machine.name);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#14. should success get 0 data report when search report with no parameter", function(done) {
    manager.getDailyOperationReport()
        .then((result) => {
            result.should.be.instanceof(Array);
            result.length.should.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#15. should success get data report when search report with machine parameter", function(done) {
    var data;
    for(var a of DailyOperation.kanban.partitions){
        data = a;
    }
    manager.getDailyOperationReport(null, null, a.machineId)
        .then((result) => {
            result.should.be.instanceof(Array);
            result.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#16. should success when delete data`, function(done) {
    manager.delete(DailyOperation)
        .then((id) => {
            id.toString().should.equal(DailyOperationId.toString());
            done();
        })
        .catch((e) => {
            done(e);
        });
})

it(`#17. should _deleted=true`, function(done) {
    manager.getSingleByQuery({
            _id: DailyOperationId
        })
        .then((data) => {
            validate(data);
            data._deleted.should.be.Boolean();
            data._deleted.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#18. should success when destroy data with id", function(done) {
    manager.destroy(DailyOperationId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#19. should null when get destroyed data`, function(done) {
    manager.getSingleByIdOrDefault(DailyOperationId)
        .then((data) => {
            if(!data)
                done();
            else
                done("not success get 0 data partition when search with no parameter");
        })
        .catch((e) => {
            done(e);
        });
});

