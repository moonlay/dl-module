'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var DailyOperationManager = require("../managers/production/finishing-printing/daily-operation-manager");

module.exports = class FactDailyOperationEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.dailyOperationManager = new DailyOperationManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
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

    extract(time) {
        var timestamp = new Date(time[0].start);
        return this.dailyOperationManager.collection.find({
            _updatedDate: {
                $gt: timestamp
            }
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
            var orderUom = item.kanban.selectedProductionOrderDetail.uom ? item.kanban.selectedProductionOrderDetail.uom.unit : null;
            //     var orderQuantity = item.orderQuantity ? item.orderQuantity : null;
            //     var material = item.material ? item.material.name.replace(/'/g, '"') : null;
            //     var materialConstruction = item.materialConstruction ? item.materialConstruction.name.replace(/'/g, '"') : null;
            //     var yarnMaterialNo = item.yarnMaterial ? item.yarnMaterial.name.replace(/'/g, '"') : null;
            //     var materialWidth = item.materialWidth ? item.materialWidth : null;

            return {
                _deleted: `'${item._deleted}'`,
                badOutput: item.badOutput ? `${item.badOutput}` : null,
                badOutputDescription: item.badOutputDescription ? `'${item.badOutputDescription}'` : null,
                code: item.code ? `'${item.code}'` : null,
                inputDate: item.dateInput ? `'${moment(item.dateInput).format("YYYY-MM-DD")}'` : null,
                outputDate: item.dateOutput ? `'${moment(item.dateOutput).format("YYYY-MM-DD")}'` : null,
                goodOutput: item.goodOutput ? `'${item.goodOutput}'` : null,
                input: item.input ? `${item.input}` : null,
                shift: item.shift ? `'${item.shift}'` : null,
                inputTime: item.timeInput ? `'${moment(item.timeInput).format("HH:mm:ss")}'` : null,
                outputTime: item.timeOutput ? `'${moment(item.timeOutput).format("HH:mm:ss")}'` : null,
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
                type: item.type ? `'${item.type}'` : null
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
                                var queryString = `INSERT INTO [dbo].[DL_Fact_Daily_Operation_Temp]([_deleted], [badOutput], [badOutputDescription], [code], [inputDate], [outputDate], [goodOutput], [input], [shift], [inputTime], [outputTime], [kanbanCode], [kanbanGrade], [kanbanCartCartNumber], [kanbanCartCode], [kanbanCartPcs], [kanbanCartQty], [kanbanInstructionCode], [kanbanInstructionName], [orderType], [selectedProductionOrderDetailCode], [selectedProductionOrderDetailColorRequest], [selectedProductionOrderDetailColorTemplate], [machineCode], [machineCondition], [machineManufacture], [machineMonthlyCapacity], [machineName], [machineProcess], [machineYear], [inputQuantityConvertion], [goodOutputQuantityConvertion], [badOutputQuantityConvertion], [failedOutputQuantityConvertion], [type]) VALUES(${item._deleted}, ${item.badOutput}, ${item.badOutputDescription}, ${item.code}, ${item.inputDate}, ${item.outputDate}, ${item.goodOutput}, ${item.input}, ${item.shift}, ${item.inputTime}, ${item.outputTime}, ${item.kanbanCode}, ${item.kanbanGrade}, ${item.kanbanCartCartNumber}, ${item.kanbanCartCode}, ${item.kanbanCartPcs}, ${item.kanbanCartQty}, ${item.kanbanInstructionCode}, ${item.kanbanInstructionName}, ${item.orderType}, ${item.selectedProductionOrderDetailCode}, ${item.selectedProductionOrderDetailColorRequest}, ${item.selectedProductionOrderDetailColorTemplate}, ${item.machineCode}, ${item.machineCondition}, ${item.machineManufacture}, ${item.machineMonthlyCapacity}, ${item.machineName}, ${item.machineProcess}, ${item.machineYear}, ${item.inputQuantityConvertion}, ${item.goodOutputQuantityConvertion}, ${item.badOutputQuantityConvertion}, ${item.failedOutputQuantityConvertion}, ${item.type});\n`;
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
                        // var path = "C:\\Users\\IttaAndLeslie\\Desktop\\daily.txt";

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