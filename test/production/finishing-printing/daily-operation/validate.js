require("should");
var dataUtil = require("../../../data-util/production/finishing-printing/daily-operation-data-util");
var stepDataUtil = require("../../../data-util/master/step-data-util");
var machineDataUtil = require("../../../data-util/master/machine-data-util");
var instructionDataUtil = require("../../../data-util/master/instruction-data-util");
var kanbanDataUtil = require("../../../data-util/production/finishing-printing/kanban-data-util");
var helper = require("../../../helper");
var validate = require("dl-models").validator;
var codeGenerator = require('../../../../src/utils/code-generator');
var moment = require('moment');

var DailyOperationManager = require("../../../../src/managers/production/finishing-printing/daily-operation-manager");
var KanbanManager = require("../../../../src/managers/production/finishing-printing/kanban-manager");
var MachineManager = require("../../../../src/managers/master/machine-manager");
var InstructionManager = require("../../../../src/managers/master/instruction-manager");
var StepManager = require("../../../../src/managers/master/step-manager");
var dailyOperationManager;
var kanbanManager;
var machineManager;
var stepManager;
var instructionManager;

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
            stepManager = new StepManager(db, {
                username: 'dev'
            });
            instructionManager = new InstructionManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var step1;
var step2;
var step3;
it("#01. should success when create new 3 data step", function(done) {
    var step = {
            process : "SCOURING",
            alias : "SC",
            indicator : [
                    {
                        name : 'SPEED',
                        value : '60',
                        uom : 'm/mnt'
                    },
                    {
                        name : 'TEMP. L BOX',
                        value : '100',
                        uom : 'C'
                    },
                    {
                        name : 'TIMING',
                        value : '30',
                        uom : 'menit'
                    },
                    {
                        name : 'LEBAR KAIN',
                        value : '90',
                        uom : 'inch'
                    },
                    {
                        name : 'COUNTER',
                        value : ''
                    }
                ]
        };
    var data1 = stepDataUtil.getTestData();
    var data2 = stepDataUtil.getTestData(step);
    step.process = "BLEACHING";
    step.alias = "BL";
    var data3 = stepDataUtil.getTestData(step);
    Promise.all([data1,data2,data3])
        .then(results =>{
            validate.master.step(results[0]);
            step1 = results[0];
            validate.master.step(results[1]);
            step2 = results[1];
            validate.master.step(results[2]);
            step3 = results[2];
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var instruction;
it("#02. should success when create new data instruction with step 1, step 2, step 3", function(done) {
    instructionDataUtil.getNewData()
        .then(data =>{
            data.steps = [step1, step2, step3];
            instructionManager.create(data)
                .then(id =>{
                    instructionManager.getSingleById(id)
                        .then(dataInstruction => {
                            validate.master.instruction(dataInstruction);
                            instruction = dataInstruction;
                            done();
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

var machine;
it("#03. should success when create new data mechine", function(done) {
    machineDataUtil.getNewData()
        .then(data =>{
            data.steps = [
                {
                    stepId : step1._id,
                    step : step1
                },{
                    stepId : step2._id,
                    step : step2
                },{
                    stepId : step3._id,
                    step : step3
                }
            ];
            machineManager.create(data)
                .then(id =>{
                    machineManager.getSingleById(id)
                        .then(dataMachine => {
                            validate.master.machine(dataMachine);
                            machine = dataMachine;
                            done();
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

var kanban;
it("#04. should success when create new data kanban", function(done) {
    kanbanDataUtil.getNewData()
        .then(data =>{
            data.instructionId = instruction._id;
            data.instruction = instruction;
            kanbanManager.create(data)
                .then(id =>{
                    kanbanManager.getSingleById(id)
                        .then(dataKanban => {
                            validate.production.finishingPrinting.kanban(dataKanban);
                            kanban = dataKanban;
                            done();
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

var dataUtilInput;
var dataUtilOutput;
it("#05. should error when create new data Input with no document kanban, mechine, step on collection database", function(done) {
    dataUtil.getNewData()
        .then(data => {
            dataUtilInput = data;
            data.kanbanId = "kanbanId";
            data.machineId = "machineId";
            data.stepId = "stepId";
            dailyOperationManager.create(data)
                .then(daily => {
                    done("should error when create new Input with no document kanban, mechine, step on collection database");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('kanban');
                        e.errors.should.have.property('machine');
                        e.errors.should.have.property('step');
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

it("#06. should error when create new data Output with no document kanban, mechine, step on collection database", function(done) {
    dataUtil.getNewData("output")
        .then(data => {
            dataUtilOutput = data;
            data.kanbanId = "kanbanId";
            data.machineId = "machineId";
            data.stepId = "stepId";
            dailyOperationManager.create(data)
                .then(daily => {
                    done("should error when create new data Output with no document kanban, mechine, step on collection database");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('kanban');
                        e.errors.should.have.property('machine');
                        e.errors.should.have.property('step');
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

it("#07. should error when create new data Input with no input value, date input, time input", function(done) {
    var data = dataUtilInput;
    delete data.input;
    delete data.dateInput;
    delete data.timeInput;
    dailyOperationManager.create(data)
        .then(daily => {
            done("should error when create new data Input with no input value, date input, time input");
        })
        .catch((e) => {
            try {
                e.errors.should.have.property('input');
                e.errors.should.have.property('dateInput');
                e.errors.should.have.property('timeInput');
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#08. should error when create new data Input with 0 input value", function(done) {
    var data = dataUtilInput;
    data.input = 0;
    dailyOperationManager.create(data)
        .then(daily => {
            done("should error when create new data Input with 0 input value");
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
});

it("#09. should error when create new data with date Input greater than today", function(done) {
    var data = dataUtilInput;
    var dateTomorrow = new Date().setDate(new Date().getDate() + 1);
    data.dateInput = moment(dateTomorrow).format('YYYY-MM-DD');
    dailyOperationManager.create(data)
        .then(daily => {
            done("should error when create new data with date Input greater than today");
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
});

it("#10. should error when create new data with time Input greater than today", function(done) {
    var data = dataUtilInput;
    var dateNow = new Date();
    var timeInMillisNow = dateNow.getTime() % 86400000;
    data.dateInput = moment(dateNow).format('YYYY-MM-DD');
    data.timeInput = timeInMillisNow + 60000;
    dailyOperationManager.create(data)
        .then(daily => {
            done("should error when create new data with time Input greater than today");
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
});

it("#11. should error when create new data Output with no data input, output value, date output, time output", function(done) {
    var data = dataUtilOutput;
    delete data.goodOutput;
    delete data.badOutput;
    delete data.dateOutput;
    delete data.timeOutput;
    dailyOperationManager.create(data)
        .then(daily => {
            done("should error when create new data Output with no data input, output value, date output, time output");
        })
        .catch((e) => {
            try {
                e.errors.should.have.property('goodOutput');
                e.errors.should.have.property('badOutput');
                e.errors.should.have.property('dateOutput');
                e.errors.should.have.property('timeOutput');
                e.errors.should.have.property('machine');
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

var step1DailyInputId1;
it("#12. on step 1 : should success when create new data Input", function(done) {
    dataUtilInput.kanban = kanban;
    dataUtilInput.kanbanId = kanban._id;
    dataUtilInput.machine = machine;
    dataUtilInput.machineId = machine._id;
    dataUtilInput.step = step1;
    dataUtilInput.stepId = step1._id;
    dataUtilInput.dateInput = '2017-01-01';
    dataUtilInput.input = kanban.cart.qty;
    dataUtilInput.timeInput = 10000;
    var data = dataUtilInput;
    dailyOperationManager.create(data)
        .then(id => {
            dailyOperationManager.getSingleById(id)
                .then(daily => {
                    validate.production.finishingPrinting.dailyOperation(daily);
                    step1DailyInputId1 = daily._id;
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

it("#13. on step 1 : should success when update input data", function(done) {
    dailyOperationManager.getSingleById(step1DailyInputId1)
        .then(daily => {
            daily.input = 35;
            daily.dateInput = '2017-01-02';
            daily.timeInput = 11000;
            dailyOperationManager.update(daily)
                .then(id => {
                    dailyOperationManager.getSingleById(id)
                        .then(data => {
                            validate.production.finishingPrinting.dailyOperation(data);
                            data.input.should.equal(daily.input);
                            data.timeInput.should.equal(daily.timeInput);
                            var date = new Date(data.dateInput);
                            var dateString = moment(date).format('YYYY-MM-DD');
                            dateString.should.equal('2017-01-02');
                            done();
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

it("#14. on step 1 : should error when create new data Output with 0 output value", function(done) {
    var data = dataUtilOutput;
    data.goodOutput = 0;
    data.badOutput = 0;
    dailyOperationManager.create(data)
        .then(daily => {
            done("on step 1 : should error when create new data Output with 0 output value");
        })
        .catch((e) => {
            try {
                e.errors.should.have.property('goodOutput');
                e.errors.should.have.property('badOutput');
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#15. on step 1 : should error when create new data with date Output greater than today", function(done) {
    dataUtilOutput.kanban = kanban;
    dataUtilOutput.kanbanId = kanban._id;
    dataUtilOutput.machine = machine;
    dataUtilOutput.machineId = machine._id;
    dataUtilOutput.step = step1;
    dataUtilOutput.stepId = step1._id;
    dataUtilOutput.goodOutput = 35;
    dataUtilOutput.badOutput = 0;
    dataUtilOutput.timeOutput = 20000;
    var data = dataUtilOutput;
    var dateTomorrow = new Date().setDate(new Date().getDate() + 1);
    data.dateOutput = moment(dateTomorrow).format('YYYY-MM-DD');
    dailyOperationManager.create(data)
        .then(daily => {
            done("on step 1 : should error when create new data with date Output greater than today");
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
});

it("#16. on step 1 : should error when create new data with time Output greater than today", function(done) {
    var data = dataUtilOutput;
    var dateNow = new Date();
    var timeInMillisNow = dateNow.getTime() % 86400000;
    data.dateOutput = moment(dateNow).format('YYYY-MM-DD');
    data.timeOutput = timeInMillisNow + 60000;
    dailyOperationManager.create(data)
        .then(daily => {
            done("on step 1 : should error when create new data with time Output greater than today");
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
});

it("#17. on step 1 : should error when create new data with date input greater than date output", function(done) {
    var data = dataUtilOutput;
    data.dateOutput = '2016-01-01';
    dailyOperationManager.create(data)
        .then(daily => {
            done("on step 1 : should error when create new data with date input greater than date output");
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
});

it("#18. on step 1 : should error when create new data with time input greater than time output", function(done) {
    var data = dataUtilOutput;
    data.dateOutput = '2017-01-02';
    data.timeOutput = 5000;
    dailyOperationManager.create(data)
        .then(daily => {
            done("on step 1 : should error when create new data with date Output greater than date input");
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
});

var step1DailyOutputId1;
it("#19. on step 1 : should success when create new data Output", function(done) {
    dataUtilOutput.dateOutput = '2017-01-02';
    dataUtilOutput.timeOutput = 20000;
    var data = dataUtilOutput;
    dailyOperationManager.create(data)
        .then(id => {
            dailyOperationManager.getSingleById(id)
                .then(daily => {
                    validate.production.finishingPrinting.dailyOperation(daily);
                    step1DailyOutputId1 = daily._id;
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

it("#20. on step 1 : should success when update data Output", function(done) {
    dailyOperationManager.getSingleById(step1DailyOutputId1)
        .then(daily => {
            daily.goodOutput = 32;
            daily.badOutput = 3;
            daily.dateOutput = '2017-01-03';
            daily.timeOutput = 10000;
            dailyOperationManager.update(daily)
                .then(id => {
                    dailyOperationManager.getSingleById(id)
                        .then(data => {
                            validate.production.finishingPrinting.dailyOperation(data);
                            data.goodOutput.should.equal(daily.goodOutput);
                            data.badOutput.should.equal(daily.badOutput);
                            data.timeOutput.should.equal(daily.timeOutput);
                            var date = new Date(data.dateOutput);
                            var dateString = moment(date).format('YYYY-MM-DD');
                            dateString.should.equal('2017-01-03');
                            done();
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

it("#21. on step 1 : should error when create new data Output with no data input", function(done) {
    dataUtilOutput.dateOutput = '2017-01-03';
    dataUtilOutput.timeOutput = 20000;
    delete dataUtilOutput.code;
    var data = dataUtilOutput;
    dailyOperationManager.create(data)
        .then(id => {
            done("on step 1 : should error when create new data Output with no data input");
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
});

it("#22. on step 1 : should error when create new data Input with step 3 before create data with step 2", function(done) {
    var data = dataUtilInput;
    data.step = step3;
    data.stepId = step3._id;
    data.dateInput = '2017-01-03';
    data.timeInput = 11000;
    dailyOperationManager.create(data)
        .then(id => {
            done("should error when create new data Input with step 3 before create data with step 2");
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
});

it("#23. on step 1 : should error when create new data Output with step 3 before create data with step 2", function(done) {
    var data = dataUtilOutput;
    data.step = step3;
    data.stepId = step3._id;
    data.dateOutput = '2017-01-03';
    data.timeOutput = 20000;
    dailyOperationManager.create(data)
        .then(id => {
            done("should error when create new data Output with step 3 before create data with step 2");
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
});

it("#24. on step 1 : should error when create new data Input with date input greather then last date output on same machine, step, kanban", function(done) {
    dailyOperationManager.getSingleById(step1DailyInputId1)
        .then(data => {
            delete data._id;
            delete data.code;
            dailyOperationManager.create(data)
                .then(id => {
                    done("on step 1 : should error when create new data Input with date input greather then last date output on same machine, step, kanban");
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

it("#25. on step 1 : should error when create new data Input with time input greather then last time output on same machine, step, kanban", function(done) {
    dailyOperationManager.getSingleById(step1DailyInputId1)
        .then(data => {
            delete data._id;
            delete data.code;
            data.dateInput = '2017-01-03';
            data.timeInput = 5000;
            dailyOperationManager.create(data)
                .then(id => {
                    done("on step 1 : should error when create new data Input with date input greather then last date output on same machine, step, kanban");
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

var step1DailyInputId2;
it("#26. on step 1 : should success when create new data Input on same machine, step, kanban", function(done) {
    dailyOperationManager.getSingleById(step1DailyInputId1)
        .then(data => {
            delete data._id;
            delete data.code;
            data.dateInput = '2017-01-03';
            data.timeInput = 11000;
            dailyOperationManager.create(data)
                .then(id => {
                    dailyOperationManager.getSingleById(id)
                        .then(daily => {
                            validate.production.finishingPrinting.dailyOperation(daily);
                            step1DailyInputId2 = daily._id;
                            done();
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

it("#27. on step 1 : should error when delete first data Input", function(done) {
    dailyOperationManager.getSingleById(step1DailyInputId1)
        .then(data => {
            dailyOperationManager.delete(data)
                .then(daily => {
                    done("should error when delete first data Input");
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
});

it("#28. on step 1 : should error when delete first data Output", function(done) {
    dailyOperationManager.getSingleById(step1DailyOutputId1)
        .then(data => {
            dailyOperationManager.delete(data)
                .then(daily => {
                    done("should error when delete first data Output");
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
});

var step1DailyOutputId2;
it("#29. on step 1 : should success when create new data Output on same machine, step, kanban", function(done) {
    dailyOperationManager.getSingleById(step1DailyOutputId1)
        .then(data => {
            delete data._id;
            delete data.code;
            data.dateOutput = '2017-01-03';
            data.timeOutput = 20000;
            dailyOperationManager.create(data)
                .then(id => {
                    dailyOperationManager.getSingleById(id)
                        .then(daily => {
                            validate.production.finishingPrinting.dailyOperation(daily);
                            step1DailyOutputId2 = daily._id;
                            done();
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

var step2DailyInputId1;
it("#30. on step 2 : should success when create new data Input", function(done) {
    dailyOperationManager.getSingleById(step1DailyInputId1)
        .then(data => {
            data.dateInput = '2017-01-04';
            data.timeInput = 10000;
            data.step = step2;
            data.stepId = step2._id;
            delete data.code;
            delete data._id;
            dailyOperationManager.create(data)
                .then(id => {
                    dailyOperationManager.getSingleById(id)
                        .then(daily => {
                            validate.production.finishingPrinting.dailyOperation(daily);
                            step2DailyInputId1 = daily._id;
                            done();
                        })
                        .catch((e) => {
                            done(e);
                        });
                })
                .catch((e) => {
                    done(e);
                })
        })
        .catch((e) => {
            done(e);
        });
});

var step2DailyOutputId1;
it("#31. on step 2 : should success when create new data Output", function(done) {
    dailyOperationManager.getSingleById(step1DailyOutputId1)
        .then(data => {
            data.dateOutput = '2017-01-04';
            data.timeOutput = 20000;
            data.step = step2;
            data.stepId = step2._id;
            delete data.code;
            delete data._id;
            dailyOperationManager.create(data)
                .then(id => {
                    dailyOperationManager.getSingleById(id)
                        .then(daily => {
                            validate.production.finishingPrinting.dailyOperation(daily);
                            step2DailyOutputId1 = daily._id;
                            kanbanManager.getSingleById(daily.kanbanId)
                                .then(kanban => {
                                    var stepArr = kanban.instruction.steps.map(function (item) { return item.process });
                                    var stepIdx = (stepArr.indexOf(step2.process) + 1);
                                    kanban.currentStepIndex.should.equal(stepIdx);
                                    kanban.currentQty.should.equal(data.goodOutput);
                                    kanban.isComplete.should.equal(false);
                                    done()
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
        })
        .catch((e) => {
            done(e);
        });
});

it("#32. on step 2 : should error when update input with step 1", function(done) {
    dailyOperationManager.getSingleById(step1DailyInputId2)
        .then(daily => {
            daily.input = 30;
            dailyOperationManager.update(daily)
                .then(id => {
                    done("on step 2 : should error when update input with step 1");
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
});

it("#33. on step 2 : should error when delete input with step 1", function(done) {
    dailyOperationManager.getSingleById(step1DailyInputId2)
        .then(daily => {
            dailyOperationManager.delete(daily)
                .then(id => {
                    done("on step 2 : should error when delete input with step 1");
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
});

it("#34. on step 2 : should error when update output with step 1", function(done) {
    dailyOperationManager.getSingleById(step1DailyOutputId2)
        .then(daily => {
            daily.goodOutput = 30;
            dailyOperationManager.update(daily)
                .then(id => {
                    done("on step 2 : should error when update output with step 1");
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
});

it("#35. on step 2 : should error when delete output with step 1", function(done) {
    dailyOperationManager.getSingleById(step1DailyOutputId2)
        .then(daily => {
            dailyOperationManager.delete(daily)
                .then(id => {
                    done("on step 2 : should error when delete output with step 1");
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
});

it("#36. on step 2 : should success when update input with step 2", function(done) {
    dailyOperationManager.getSingleById(step2DailyInputId1)
        .then(daily => {
            daily.input = 35;
            dailyOperationManager.update(daily)
                .then(id => {
                    dailyOperationManager.getSingleById(step2DailyInputId1)
                        .then(dataResult => {
                            dataResult.input.should.equal(daily.input);
                            done();
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

it("#37. on step 2 : should success when update input with step 2", function(done) {
    dailyOperationManager.getSingleById(step2DailyOutputId1)
        .then(daily => {
            daily.goodOutput = 33;
            daily.badOutput = 2;
            dailyOperationManager.update(daily)
                .then(id => {
                    dailyOperationManager.getSingleById(step2DailyOutputId1)
                        .then(dataResult => {
                            dataResult.goodOutput.should.equal(daily.goodOutput);
                            dataResult.badOutput.should.equal(daily.badOutput);
                            kanbanManager.getSingleById(dataResult.kanbanId)
                                .then(kanban => {
                                    kanban.currentQty.should.equal(dataResult.goodOutput);
                                    done()
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
        })
        .catch((e) => {
            done(e);
        });
});

it("#38. on step 2 : should error when update input with step 1", function(done) {
    dailyOperationManager.getSingleById(step1DailyInputId2)
        .then(daily => {
            daily.input = 30;
            dailyOperationManager.update(daily)
                .then(id => {
                    done("should error when update input with step 1")
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
});

it("#39. on step 2 : should error when delete input with step 1", function(done) {
    dailyOperationManager.getSingleById(step1DailyInputId2)
        .then(daily => {
            dailyOperationManager.delete(daily)
                .then(id => {
                    done("should error when update input with step 1")
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
});

it("#40. on step 2 : should error when update output with step 1", function(done) {
    dailyOperationManager.getSingleById(step1DailyOutputId2)
        .then(daily => {
            daily.input = 30;
            dailyOperationManager.update(daily)
                .then(id => {
                    done("should error when update output with step 1")
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
});

it("#41. on step 2 : should error when delete output with step 1", function(done) {
    dailyOperationManager.getSingleById(step1DailyOutputId2)
        .then(daily => {
            dailyOperationManager.delete(daily)
                .then(id => {
                    done("should error when update input with step 1")
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
});

var step3DailyInput;
it("#42. on step 3 : should success when input data with step 3", function(done) {
    dailyOperationManager.getSingleById(step2DailyInputId1)
        .then(daily => {
            daily.step = step3;
            daily.stepId = step3._id;
            daily.input = 33;
            daily.dateInput = '2017-01-05';
            daily.timeInput = 10000;
            delete daily._id;
            delete daily.code;
            dailyOperationManager.create(daily)
                .then(id => {
                    dailyOperationManager.getSingleById(id)
                        .then(data =>{
                            validate.production.finishingPrinting.dailyOperation(data);
                            step3DailyInput = data._id;
                            done();
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

var step3DailyOutput;
it("#43. on step 3 : should success when output data with step 3", function(done) {
    dailyOperationManager.getSingleById(step2DailyOutputId1)
        .then(daily => {
            daily.step = step3;
            daily.stepId = step3._id;
            daily.goodOutput = 35;
            daily.badOutput = 0;
            daily.dateOutput = '2017-01-05';
            daily.timeOutput = 20000;
            delete daily._id;
            delete daily.code;
            dailyOperationManager.create(daily)
                .then(id => {
                    dailyOperationManager.getSingleById(id)
                        .then(data =>{
                            validate.production.finishingPrinting.dailyOperation(data);
                            step3DailyOutput = data._id;
                            kanbanManager.getSingleById(data.kanbanId)
                                .then(kanban => {
                                    var stepArr = kanban.instruction.steps.map(function (item) { return item.process });
                                    var stepIdx = (stepArr.indexOf(step3.process) + 1);
                                    kanban.currentStepIndex.should.equal(stepIdx);
                                    kanban.currentQty.should.equal(data.goodOutput);
                                    done()
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
        })
        .catch((e) => {
            done(e);
        });
});

it("#44. on step 3 : should success when delete output data with step 3", function(done) {
    dailyOperationManager.getSingleById(step3DailyOutput)
        .then(data => {
            dailyOperationManager.delete(data)
                .then(id =>{
                    kanbanManager.getSingleById(data.kanbanId)
                        .then(kanban => {
                            kanban.isComplete.should.equal(false);
                            dailyOperationManager.getSingleById(step2DailyOutputId1)
                                .then(daily => {
                                    daily.goodOutput.should.equal(kanban.currentQty);
                                    var stepArr = kanban.instruction.steps.map(function (item) { return item.process });
                                    var stepIdx = (stepArr.indexOf(step2.process) + 1);
                                    kanban.currentStepIndex.should.equal(stepIdx);
                                    done();
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
        })
        .catch((e) => {
            done(e);
        });
});