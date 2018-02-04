'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");
const SELECTED_FIELDS = {
    "_deleted": 1,
    "_createdDate": 1,
    "code": 1,
    "productionOrder.orderNo": 1,
    "productionOrder.salesContractNo": 1,
    "grade": 1,
    "currentStepIndex": 1,
    "isComplete": 1,
    "cart.cartNumber": 1,
    "cart.qty": 1,
    "instruction._id": 1,
    "instruction.code": 1,
    "instruction.name": 1,
    "instruction.steps._id": 1,
    "instruction.steps.code": 1,
    "instruction.steps.process": 1,
    "instruction.steps.processArea": 1,
    "instruction.steps.machine.code": 1,
    "instruction.steps.machine.name": 1,
    "instruction.steps.machine.monthlyCapacity": 1,
    "instruction.steps.deadline": 1,
    "currentQty": 1,
    "productionOrder.processType.name": 1,
    "productionOrder.orderType.name": 1,
    "isBadOutput": 1,
    "isReprocess": 1,
    "oldKanban._id": 1
}

// internal deps 
require("mongodb-toolkit");

var KanbanManager = require("../../managers/production/finishing-printing/kanban-manager");

module.exports = class FactMonitoringKanbanEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.kanbanManager = new KanbanManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date()
        this.migrationLog.insert({
            description: "Fact Kanban from MongoDB to Azure DWH",
            start: startedDate,
        })
        return this.timestamp()
            .then((time) => this.extract(time))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then((results) => {
                console.log("Success!");
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Fact Kanban from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: "Successful"
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            })
            .catch((err) => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Fact Kanban from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: err
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            });
    };

    timestamp() {
        return this.migrationLog.find({
            description: "Fact Kanban from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        return this.kanbanManager.collection.find({
            "_updatedDate": {
                "$gte": timestamp
            }
        }, SELECTED_FIELDS).toArray();
    }

    /*
    joinDailyOperation(kanbans) {
        var joinDailyOperations = kanbans.map((kanban) => {
            var kanbanCurrentStepId = kanban.instruction && kanban.instruction.steps.length > 0 && kanban.instruction.steps[Math.abs(kanban.currentStepIndex === kanban.instruction.steps.length ? kanban.currentStepIndex - 1 : kanban.currentStepIndex)]._id ? kanban.instruction.steps[Math.abs(kanban.currentStepIndex === kanban.instruction.steps.length ? kanban.currentStepIndex - 1 : kanban.currentStepIndex)]._id : null;
            // if (kanban.currentStepIndex > kanban.instruction.steps.length)
            var getDailyOperations = this.dailyOperationManager.collection.find({
                "kanban.code": kanban.code,
                "step._id": kanbanCurrentStepId,
                _deleted: false,
                type: "input"
            }, {
                    "machine.name": 1,
                    "dateInput": 1,
                    "timeInput": 1,
                    "input": 1,
                    "step.proccessArea": 1
                }).limit(1).toArray();
            return getDailyOperations.then((dailyOperations) => {
                var arr = dailyOperations.map((dailyOperation) => {
                    kanban.dailyOperationMachine = dailyOperation.machine && dailyOperation.machine.name ? dailyOperation.machine.name : null;
                    kanban.dateInput = dailyOperation.dateInput ? dailyOperation.dateInput : null;
                    kanban.timeInput = dailyOperation.timeInput ? dailyOperation.timeInput : null;
                    kanban.inputQuantity = dailyOperation.input ? dailyOperation.input : null;
                    kanban.dailyOperationProcessArea = dailyOperation.step && dailyOperation.step.proccessArea ? dailyOperation.step.proccessArea : null;
                    return kanban;
                });
                if (arr.length === 0) {
                    kanban.dailyOperationMachine = null;
                    kanban.dateInput = null;
                    kanban.timeInput = null;
                    kanban.inputQuantity = null;
                    kanban.dailyOperationProcessArea = null;
                    arr.push(kanban);
                }
                return Promise.resolve(arr);
            });
        });
        return Promise.all(joinDailyOperations)
            .then(((joinDailyOperation) => {
                return Promise.resolve([].concat.apply([], joinDailyOperation));
            }));
    }
    */

    transform(data) {
        var result = data.map((item) => {
            var kanban = item.instruction && item.instruction.steps && item.instruction.steps.length > 0 ? item : null;

            if (kanban) {
                /*
                var stepIndex = kanban.currentStepIndex === kanban.instruction.steps.length ? Math.abs(kanban.currentStepIndex - 1) : Math.abs(kanban.currentStepIndex);
                var kanbanSteps = kanban.instruction.steps[stepIndex];
                */
                var index = 0;
                var kanbanData = kanban.instruction.steps.map((step) => {
                    return {
                        deleted: `'${kanban._deleted}'`,
                        kanbanCode: kanban.code ? `'${kanban.code}'` : null,
                        kanbanDate: kanban._createdDate ? `'${moment(kanban._createdDate).add(7, "hours").format("YYYY-MM-DD")}'` : null,
                        productionOrderNo: kanban.productionOrder && kanban.productionOrder.orderNo ? `'${kanban.productionOrder.orderNo}'` : null,
                        kanbanGrade: kanban.grade ? `'${kanban.grade}'` : null,
                        kanbanCartNumber: kanban.cart && kanban.cart.cartNumber ? `'${kanban.cart.cartNumber}'` : null,
                        kanbanCartQuantity: kanban.cart && kanban.cart.qty ? `${kanban.cart.qty}` : null,
                        kanbanInstructionId: kanban.instruction && kanban.instruction._id ? `'${kanban.instruction._id}'` : null,
                        kanbanInstructionCode: kanban.instruction && kanban.instruction.code ? `'${kanban.instruction.code}'` : null,
                        kanbanInstructionName: kanban.instruction && kanban.instruction.name ? `'${kanban.instruction.name}'` : null,
                        kanbanStepsId: step._id ? `'${step._id}'` : null,
                        kanbanStepsCode: step.code ? `'${step.code}'` : null,
                        kanbanStepsName: step.process ? `'${step.process}'` : null,
                        machineCode: step.machine && step.machine.code ? `'${step.machine.code}'` : null,
                        machineName: step.machine && step.machine.name ? `'${step.machine.name}'` : null,
                        machineMonthlyCapacity: step.machine && step.machine.monthlyCapacity ? `${step.machine.monthlyCapacity}` : null,
                        deadline: step.deadline ? `'${moment(step.deadline).add(7, "hours").format("YYYY-MM-DD")}'` : null,
                        currentStepIndex: `${kanban.currentStepIndex}`,
                        processArea: step.processArea ? `'${step.processArea}'` : null,
                        isComplete: `'${kanban.isComplete}'`,
                        stepsLength: `${kanban.instruction.steps.length}`,
                        stepIndex: index++,
                        salesContractNo: kanban.productionOrder && kanban.productionOrder.salesContractNo ? `'${kanban.productionOrder.salesContractNo}'` : null,
                        processType: kanban.productionOrder && kanban.productionOrder.processType && kanban.productionOrder.processType.name ? `'${kanban.productionOrder.processType.name}'` : null,
                        orderType: kanban.productionOrder && kanban.productionOrder.orderType && kanban.productionOrder.orderType.name ? `'${kanban.productionOrder.orderType.name}'` : null,
                        isBadOutput: kanban.isBadOutput != undefined ? `'${kanban.isBadOutput}'` : null,
                        isReprocess: kanban.isReprocess != undefined ? `'${kanban.isReprocess}'` : null,
                        oldKanbanId: kanban.oldKanban != undefined && kanban.oldKanban && kanban.oldKanban._id ? `'${kanban.oldKanban._id}'` : null,
                        id: `'${kanban._id}'`
                    }
                });
                return [].concat.apply([], kanbanData);
            }
        });
        return Promise.resolve([].concat.apply([], result));
    };

    insertQuery(sql, query) {
        return new Promise((resolve, reject) => {
            sql.query(query, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                };
            });
        });
    };

    load(data) {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();

                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);

                        var command = [];

                        var sqlQuery = 'INSERT INTO [DL_Fact_Kanban_Temp] ';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `\nSELECT ${item.deleted}, ${item.kanbanCode}, ${item.kanbanDate}, ${item.productionOrderNo}, ${item.kanbanGrade}, ${item.kanbanCartNumber}, ${item.kanbanCartQuantity}, ${item.kanbanInstructionId}, ${item.kanbanInstructionCode}, ${item.kanbanInstructionName}, ${item.kanbanStepsId}, ${item.kanbanStepsCode}, ${item.kanbanStepsName}, ${item.machineCode}, ${item.machineName}, ${item.machineMonthlyCapacity}, ${item.deadline}, ${item.currentStepIndex}, ${item.processArea}, ${item.isComplete}, ${item.stepsLength}, ${item.stepIndex}, ${item.salesContractNo}, ${item.processType}, ${item.orderType}, ${item.isBadOutput}, ${item.isReprocess}, ${item.oldKanbanId}, ${item.id} UNION ALL `;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 === 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "INSERT INTO [DL_Fact_Kanban_Temp] ";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }

                        if (sqlQuery != "") {
                            sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                            command.push(this.insertQuery(request, `${sqlQuery}`));
                        }

                        this.sql.multiple = true;

                        // var fs = require("fs");
                        // var path = "C:\\Users\\jacky.rusly\\Desktop\\kanban.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_UPSERT_FACT_KANBAN").then((execResult) => {
                                    transaction.commit((err) => {
                                        if (err)
                                            reject(err);
                                        else
                                            resolve(results);
                                    });

                                }).catch((error) => {
                                    transaction.rollback((err) => {
                                        console.log("rollback")
                                        if (err)
                                            reject(err)
                                        else
                                            reject(error);
                                    });
                                })
                            })
                            .catch((error) => {
                                transaction.rollback((err) => {
                                    console.log("rollback");
                                    if (err)
                                        reject(err)
                                    else
                                        reject(error);
                                });
                            });
                    })
                })
                .catch((err) => {
                    reject(err);
                })
        })
            .catch((err) => {
                reject(err);
            })
    }
}