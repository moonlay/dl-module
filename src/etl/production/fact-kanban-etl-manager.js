'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

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
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Fact Kanban Operation from MongoDB to Azure DWH",
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
                    description: "Fact Kanban Operation from MongoDB to Azure DWH",
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
            description: "Fact Kanban Operation from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(times) {
        var time = "1970-01-01";
        var timestamp = new Date(time);
        return this.kanbanManager.collection.find({
            _updatedDate: {
                $gt: timestamp
            }
        }, {
                _deleted: 1,
                _createdDate: 1,
                code: 1,
                "productionOrder.orderNo": 1,
                grade: 1,
                "cart.cartNumber": 1,
                "cart.qty": 1,
                "instruction._id": 1,
                "instruction.code": 1,
                "instruction.name": 1,
                "instruction.steps._id": 1,
                "instruction.steps.code": 1,
                "instruction.steps.process": 1,
                "instruction.steps.machine.code": 1,
                "instruction.steps.machine.name": 1,
                "instruction.steps.machine.monthlyCapacity": 1,
                "instruction.steps.deadline": 1
            }).toArray();
    }

    // orderQuantityConvertion(uom, quantity) {
    //     if (uom.toLowerCase() === "met" || uom.toLowerCase() === "mtr" || uom.toLowerCase() === "pcs") {
    //         return quantity;
    //     } else if (uom.toLowerCase() === "yard" || uom.toLowerCase() === "yds") {
    //         return quantity * 0.9144;
    //     }
    // }

    transform(data) {
        var result = data.map((item) => {
            var kanban = item.instruction && item.instruction.steps && item.instruction.steps.length > 0 ? item : null;

            if (kanban) {
                var results = kanban.instruction.steps.map((kanbanSteps) => {
                    return {
                        deleted: `'${kanban._deleted}'`,
                        kanbanCode: kanban.code ? `'${kanban.code}'` : null,
                        kanbanDate: kanban._createdDate ? `'${moment(kanban._createdDate).format("L")}'` : null,
                        productionOrderNo: kanban.productionOrder && kanban.productionOrder.orderNo ? `'${kanban.productionOrder.orderNo}'` : null,
                        kanbanGrade: kanban.grade ? `'${kanban.grade}'` : null,
                        kanbanCartNumber: kanban.cart && kanban.cart.cartNumber ? `'${kanban.cart.cartNumber}'` : null,
                        kanbanCartQuantity: kanban.cart && kanban.cart.qty ? `${kanban.cart.qty}` : null,
                        kanbanInstructionId: kanban.instruction && kanban.instruction._id ? `'${kanban.instruction._id}'` : null,
                        kanbanInstructionCode: kanban.instruction && kanban.instruction.code ? `'${kanban.instruction.code}'` : null,
                        kanbanInstructionName: kanban.instruction && kanban.instruction.name ? `'${kanban.instruction.name}'` : null,
                        kanbanStepsId: kanbanSteps._id ? `'${kanbanSteps._id}'` : null,
                        kanbanStepsCode: kanbanSteps.code ? `'${kanbanSteps.code}'` : null,
                        kanbanStepsName: kanbanSteps.process ? `'${kanbanSteps.process}'` : null,
                        machineCode: kanbanSteps.machine && kanbanSteps.machine.code ? `'${kanbanSteps.machine.code}'` : null,
                        machineName: kanbanSteps.machine && kanbanSteps.machine.name ? `'${kanbanSteps.machine.name}'` : null,
                        machineMonthlyCapacity: kanbanSteps.machine && kanbanSteps.machine.monthlyCapacity ? `${kanbanSteps.machine.monthlyCapacity}` : null,
                        deadline: kanbanSteps.deadline ? `'${moment(kanbanSteps.deadline).format("L")}'` : null
                    }
                })
                return [].concat.apply([], results);
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

                        var sqlQuery = '';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `INSERT INTO [dbo].[DL_Fact_Kanban_Temp]([deleted], [kanbanCode], [kanbanDate], [productionOrderNo], [kanbanGrade], [kanbanCartNumber], [kanbanCartQuantity], [kanbanInstructionId], [kanbanInstructionCode], [kanbanInstructionName], [kanbanStepsId], [kanbanStepsCode], [kanbanStepsName], [machineCode], [machineName], [machineMonthlyCapacity], [deadline]) VALUES(${item.deleted}, ${item.kanbanCode}, ${item.kanbanDate}, ${item.productionOrderNo}, ${item.kanbanGrade}, ${item.kanbanCartNumber}, ${item.kanbanCartQuantity}, ${item.kanbanInstructionId}, ${item.kanbanInstructionCode}, ${item.kanbanInstructionName}, ${item.kanbanStepsId}, ${item.kanbanStepsCode}, ${item.kanbanStepsName}, ${item.machineCode}, ${item.machineName}, ${item.machineMonthlyCapacity}, ${item.deadline});\n`;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 10000 === 0) {
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }

                        if (sqlQuery != "")
                            command.push(this.insertQuery(request, `${sqlQuery}`));

                        this.sql.multiple = true;

                        // var fs = require("fs");
                        // var path = "C:\\Users\\IttaAndLeslie\\Desktop\\kanban.txt";

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