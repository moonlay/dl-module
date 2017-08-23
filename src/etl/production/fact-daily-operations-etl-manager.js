'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var global = require("../../global");
var locale = global.config.locale;
var moment = require("moment");
const selectedFields = {
    "_deleted": 1,
    "badOutput": 1,
    "badOutputDescription": 1,
    "code": 1,
    "dateInput": 1,
    "dateOutput": 1,
    "goodOutput": 1,
    "input": 1,
    "shift": 1,
    "timeInput": 1,
    "timeOutput": 1,
    "kanban.code": 1,
    "kanban.grade": 1,
    "kanban.cart.cartNumber": 1,
    "kanban.cart.code": 1,
    "kanban.cart.pcs": 1,
    "kanban.cart.qty": 1,
    "kanban.cart.instruction.code": 1,
    "kanban.cart.instruction.name": 1,
    "kanban.productionOrder.orderType.name": 1,
    "kanban.selectedProductionOrderDetail.colorRequest": 1,
    "kanban.selectedProductionOrderDetail.colorTemplate": 1,
    "kanban.selectedProductionOrderDetail.uom.unit": 1,
    "machine.code": 1,
    "machine.condition": 1,
    "machine.manufacture": 1,
    "machine.monthlyCapacity": 1,
    "machine.name": 1,
    "machine.process": 1,
    "machine.year": 1,
    "failedOutput": 1,
    "type": 1,
    "stepId": 1,
    "step.process": 1,
    "step.proccessArea": 1
};

// internal deps 
require("mongodb-toolkit");

var DailyOperationManager = require("../../managers/production/finishing-printing/daily-operation-manager");

module.exports = class FactDailyOperationEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.dailyOperationManager = new DailyOperationManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        moment.locale(locale.name);
        var startedDate = new Date()
        this.migrationLog.insert({
            description: "Fact Daily Operation from MongoDB to Azure DWH",
            start: startedDate,
        })
        return this.timestamp()
            .then((time) => this.extract(time))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then((results) => {
                console.log("Success!")
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Fact Daily Operation from MongoDB to Azure DWH",
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
                    description: "Fact Daily Operation from MongoDB to Azure DWH",
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
            description: "Fact Daily Operation from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(times) {
        var time = times.length > 0 ? times[0].start : "1970-01-01";
        var timestamp = new Date(time);
        var inputArr = [];
        return this.dailyOperationManager.collection.find({
            _updatedDate: {
                $gte: timestamp
            }
        }, {
                "code": 1
            }).toArray()
            .then((datas) => this.getInputDatas(datas))
            .then((inputDatas) => {
                inputArr = inputDatas;
                return this.getOutputDatas(inputDatas)
            })
            .then((outputDatas) => {
                return this.joinDatas(inputArr, outputDatas)
            })
    }

    getInputDatas(datas) {
        var inputCodeArr = datas.map((data) => {
            return data.code;
        });
        return this.dailyOperationManager.collection.find({
            "code": {
                $in: inputCodeArr
            },
            "type": "input"
        }, selectedFields).toArray()
    }

    getOutputDatas(inputDatas) {
        var outputCodeArr = inputDatas.map((inputData) => {
            return inputData.code;
        });

        return this.dailyOperationManager.collection.find({
            "code": {
                $in: outputCodeArr
            },
            "type": "output"
        }, selectedFields).toArray()
    }

    joinDatas(inputDatas, outputDatas) {
        for (var outputData of outputDatas) {
            inputDatas.push(outputData);
        }
        return inputDatas;
    }

    transform(data) {
        var result = data.map((item) => {

            return {
                _deleted: `'${item._deleted}'`,
                badOutput: item.badOutput ? `${item.badOutput}` : null,
                badOutputDescription: item.badOutputDescription ? `'${item.badOutputDescription}'` : null,
                code: item.code ? `'${item.code}'` : null,
                inputDate: item.dateInput ? `'${moment(item.dateInput).subtract(7, "hours").format("YYYY-MM-DD")}'` : null,
                outputDate: item.dateOutput ? `'${moment(item.dateOutput).subtract(7, "hours").format("YYYY-MM-DD")}'` : null,
                goodOutput: item.goodOutput ? `'${item.goodOutput}'` : null,
                input: item.input ? `${item.input}` : null,
                shift: item.shift ? `'${item.shift}'` : null,
                inputTime: item.timeInput ? `'${moment(item.timeInput).subtract(7, "hours").format("HH:mm:ss")}'` : null,
                outputTime: item.timeOutput ? `'${moment(item.timeOutput).subtract(7, "hours").format("HH:mm:ss")}'` : null,
                kanbanCode: item.kanban ? `'${item.kanban.code}'` : null,
                kanbanGrade: item.kanban ? `'${item.kanban.grade}'` : null,
                kanbanCartCartNumber: item.kanban.cart ? `'${item.kanban.cart.cartNumber}'` : null,
                kanbanCartCode: item.kanban.cart ? `'${item.kanban.cart.code}'` : null,
                kanbanCartPcs: item.kanban.cart ? `${item.kanban.cart.pcs}` : null,
                kanbanCartQty: item.kanban.cart ? `${item.kanban.cart.qty}` : null,
                kanbanInstructionCode: item.kanban.instruction ? `'${item.kanban.instruction.code}'` : null,
                kanbanInstructionName: item.kanban.instruction ? `'${item.kanban.instruction.name}'` : null,
                orderType: item.kanban.productionOrder && item.kanban.productionOrder.orderType ? `'${item.kanban.productionOrder.orderType.name}'` : null,
                selectedProductionOrderDetailCode: item.kanban.selectedProductionOrderDetail.code ? `'${item.kanban.selectedProductionOrderDetail.code.replace(/'/g, '"')}'` : null,
                selectedProductionOrderDetailColorRequest: item.kanban.selectedProductionOrderDetail.colorRequest ? `'${item.kanban.selectedProductionOrderDetail.colorRequest.replace(/'/g, '"')}'` : null,
                selectedProductionOrderDetailColorTemplate: item.kanban.selectedProductionOrderDetail.colorTemplate ? `'${item.kanban.selectedProductionOrderDetail.colorTemplate.replace(/'/g, '"')}'` : null,
                machineCode: item.machine && item.machine.code ? `'${item.machine.code}'` : null,
                machineCondition: item.machine && item.machine.condition ? `'${item.machine.condition}'` : null,
                machineManufacture: item.machine && item.machine.manufacture ? `'${item.machine.manufacture}'` : null,
                machineMonthlyCapacity: item.machine && item.machine.monthlyCapacity ? `${item.machine.monthlyCapacity}` : null,
                machineName: item.machine && item.machine.name ? `'${item.machine.name}'` : null,
                machineProcess: item.machine && item.machine.process ? `'${item.machine.process}'` : null,
                machineYear: item.machine && item.machine.year ? `'${item.machine.year}'` : null,
                inputQuantityConvertion: item.kanban.selectedProductionOrderDetail.uom && item.input ? `${item.input}` : null,
                goodOutputQuantityConvertion: item.goodOutput && item.kanban.selectedProductionOrderDetail.uom ? `${item.goodOutput}` : null,
                badOutputQuantityConvertion: item.badOutput && item.kanban.selectedProductionOrderDetail.uom ? `${item.badOutput}` : null,
                failedOutputQuantityConvertion: item.failedOutput && item.kanban.selectedProductionOrderDetail.uom ? `${item.failedOutput}` : null,
                type: item.type ? `'${item.type}'` : null,
                stepProcessId: item.stepId ? `'${item.stepId}'` : null,
                stepProcess: item.step && item.step.process ? `'${item.step.process}'` : null,
                processArea: item.step && item.step.proccessArea ? `'${item.step.proccessArea}'` : null
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

                        var sqlQuery = 'INSERT INTO [DL_Fact_Daily_Operation_Temp] ';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `\nSELECT ${item._deleted}, ${item.badOutput}, ${item.badOutputDescription}, ${item.code}, ${item.inputDate}, ${item.outputDate}, ${item.goodOutput}, ${item.input}, ${item.shift}, ${item.inputTime}, ${item.outputTime}, ${item.kanbanCode}, ${item.kanbanGrade}, ${item.kanbanCartCartNumber}, ${item.kanbanCartCode}, ${item.kanbanCartPcs}, ${item.kanbanCartQty}, ${item.kanbanInstructionCode}, ${item.kanbanInstructionName}, ${item.orderType}, ${item.selectedProductionOrderDetailCode}, ${item.selectedProductionOrderDetailColorRequest}, ${item.selectedProductionOrderDetailColorTemplate}, ${item.machineCode}, ${item.machineCondition}, ${item.machineManufacture}, ${item.machineMonthlyCapacity}, ${item.machineName}, ${item.machineProcess}, ${item.machineYear}, ${item.inputQuantityConvertion}, ${item.goodOutputQuantityConvertion}, ${item.badOutputQuantityConvertion}, ${item.failedOutputQuantityConvertion}, ${item.type}, ${item.stepProcessId}, ${item.stepProcess}, ${item.processArea} UNION ALL `;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 4000 === 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "INSERT INTO [DL_Fact_Fabric_Quality_Control_Temp] ";
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
                        // var path = "C:\\Users\\leslie.aula\\Desktop\\daily.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_UPSERT_FACT_DAILY_OPERATION").then((execResult) => {
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