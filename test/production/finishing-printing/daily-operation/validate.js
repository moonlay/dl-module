require("should");
var dataUtil = require("../../../data-util/production/finishing-printing/daily-operation-data-util");
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.dailyOperation;
var codeGenerator = require('../../../../src/utils/code-generator');
var moment = require('moment');

var DailyOperationManager = require("../../../../src/managers/production/finishing-printing/daily-operation-manager");
var KanbanManager = require("../../../../src/managers/production/finishing-printing/kanban-manager");
var MachineManager = require("../../../../src/managers/master/machine-manager");
var dailyOperationManager;
var kanbanManager;
var machineManager;

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            dailyOperationManager = new DailyOperationManager(db, {
                username: 'dev'
            });
            kanbanManager = new KanbanManager(db, {
                username: 'dev'
            });
            machineManager = new MachineManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should success when create new test data on data util", function(done) {
    dataUtil.getNewTestData()
            .then(data => {
                validate(data);
                dailyOperationManager.destroy(data._id)
                        .then(itemDes => {
                            itemDes.should.be.Boolean();
                            itemDes.should.equal(true);
                            dailyOperationManager.getSingleByIdOrDefault(data._id)
                                    .then((item) => {
                                        if(!item)
                                            done();
                                        else
                                            done("not success when create new test data on data util");
                                    })
                                    .catch((e) => {
                                        done(e);
                                    });
                        })
                        .catch((e) => {
                            done(e);
                        });
            })
            .catch((e) => {
                done(e);
            });
});

it("#02. should error when create new and no document kanban on collection database", function(done) {
    dataUtil.getNewData()
            .then(data => {
                kanbanManager.destroy(data.kanbanId)
                        .then(itemDes => {
                            itemDes.should.be.Boolean();
                            itemDes.should.equal(true);
                            dailyOperationManager.create(data)
                                    .then((item) => {
                                        done("should error when create new and no document kanban on collection database");
                                    })
                                    .catch((e) => {
                                        try {
                                            e.errors.should.have.property('kanban');
                                            done();
                                        }
                                        catch (ex) {
                                            done(ex);
                                        }
                                    });
                        })
                        .catch((e) => {
                            done(e);
                        });
            })
            .catch((e) => {
                done(e);
            });
});

it("#03. should error when create new and no document machine on collection database", function(done) {
    dataUtil.getNewData()
            .then(data => {
                machineManager.destroy(data.machineId)
                        .then(itemDes => {
                            itemDes.should.be.Boolean();
                            itemDes.should.equal(true);
                            dailyOperationManager.create(data)
                                    .then((item) => {
                                        done("should error when create new and no document machine on collection database");
                                    })
                                    .catch((e) => {
                                        try {
                                            e.errors.should.have.property('machine');
                                            done();
                                        }
                                        catch (ex) {
                                            done(ex);
                                        }
                                    });
                        })
                        .catch((e) => {
                            done(e);
                        });
            })
            .catch((e) => {
                done(e);
            });
});

it("#04. should success when create new without output data", function(done) {
    dataUtil.getNewData()
            .then(data => {
                delete data.dateOutput;
                delete data.timeOutput;
                delete data.goodOutput;
                delete data.badOutput;
                delete data.badOutputDescription;
                dailyOperationManager.create(data)
                    .then((item) => {
                        dailyOperationManager.getSingleById(item)
                            .then(daily => {
                                validate(daily);
                                done();
                            })
                            .catch((e) => {
                                done(e);
                            });
                    })
                    .catch((e) => {
                        done(e)
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#05. should error when create new with 0 input qty", function(done) {
    dataUtil.getNewData()
            .then(data => {
                data.input  = 0;
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new with 0 input qty");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('input');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#06. should error when create new data with dateStart greater than today", function(done) {
    dataUtil.getNewData()
            .then(data => {
                var dateTomorrow = new Date().setDate(new Date().getDate() + 1);
                data.dateInput = moment(dateTomorrow).format('YYYY-MM-DD');
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data with dateStart greater than today");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('dateInput');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#07. should error when create new data with time input greater than today", function(done) {
    dataUtil.getNewData()
            .then(data => {
                var dateNow = new Date();
                var timeInMillisNow = dateNow.getTime() % 86400000;
                data.dateInput = moment(dateNow).format('YYYY-MM-DD');
                data.timeInput = timeInMillisNow + 60000;
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data with time input greater than today");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('timeInput');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#08. should error when create new data without date output", function(done) {
    dataUtil.getNewData()
            .then(data => {
                delete data.dateOutput;
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data without date output");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('dateOutput');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#09. should error when create new data without date output", function(done) {
    dataUtil.getNewData()
            .then(data => {
                delete data.timeOutput;
                delete data.goodOutput;
                delete data.badOutput;
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data without date output");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('timeOutput');
                            e.errors.should.have.property('goodOutput');
                            e.errors.should.have.property('badOutput');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#10. should error when create new data with date output greater than today", function(done) {
    dataUtil.getNewData()
            .then(data => {
                var dateTomorrow = new Date().setDate(new Date().getDate() + 1);
                data.dateOutput = moment(dateTomorrow).format('YYYY-MM-DD');
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data with date output greater than today");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('dateOutput');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#11. should error when create new data with time output greater than today", function(done) {
    dataUtil.getNewData()
            .then(data => {
                var dateNow = new Date();
                var timeInMillisNow = dateNow.getTime() % 86400000;
                data.dateOutput = moment(dateNow).format('YYYY-MM-DD');
                data.timeOutput = timeInMillisNow + 60000;
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data with time output greater than today");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('timeOutput');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#12. should error when create new data with date input greater than date output", function(done) {
    dataUtil.getNewData()
            .then(data => {
                data.dateInput = '2017-01-02';
                data.dateOutput = '2017-01-01';
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data with date input greater than date output");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('dateOutput');
                            e.errors.should.have.property('dateInput');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#13. should error when create new data with time input greater time date output", function(done) {
    dataUtil.getNewData()
            .then(data => {
                data.dateInput = '2017-01-01';
                data.dateOutput = '2017-01-01';
                data.timeInput = 10000;
                data.timeOutput = 5000;
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data with time input greater time date output");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('timeInput');
                            e.errors.should.have.property('timeOutput');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#14. should error when create new data with goodOutput greater than input", function(done) {
    dataUtil.getNewData()
            .then(data => {
                data.goodOutput = data.input + 10;
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data with goodOutput greater than input");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('goodOutput');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#15. should error when create new data with badOutput greater than input", function(done) {
    dataUtil.getNewData()
            .then(data => {
                data.badOutput = data.input + 10;
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data with badOutput greater than input");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('badOutput');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});

it("#16. should error when create new data with sum between badOutput and goodOutput greater than input", function(done) {
    dataUtil.getNewData()
            .then(data => {
                data.badOutput += 1;
                data.goodOutput += 1;
                dailyOperationManager.create(data)
                    .then((item) => {
                        done("should error when create new data with sum between badOutput and goodOutput greater than inputy");
                    })
                    .catch((e) => {
                        try {
                            e.errors.should.have.property('badOutput');
                            e.errors.should.have.property('goodOutput');
                            e.errors.should.have.property('input');
                            done();
                        }
                        catch (ex) {
                            done(ex);
                        }
                    });
            })
            .catch((e) => {
                done(e);
            });
});