'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var FinishingPrintingSalesContractManager = require("../managers/sales/finishing-printing-sales-contract-manager");
var ProductionOrderManager = require("../managers/sales/production-order-manager");
var KanbanManager = require("../managers/production/finishing-printing/kanban-manager");
var DailyOperationsManager = require("../managers/production/finishing-printing/daily-operation-manager");
var FabricQualityControlManager = require("../managers/production/finishing-printing/fabric-quality-control-manager");

module.exports = class FactProductionOrderStatusManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.finishingPrintingSalesContractManager = new FinishingPrintingSalesContractManager(db, user);
        this.productionOrderManager = new ProductionOrderManager(db, user);
        this.kanbanManager = new KanbanManager(db, user);
        this.dailyOperationsManager = new DailyOperationsManager(db, user);
        this.fabricQualityControlManager = new FabricQualityControlManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date()
        this.migrationLog.insert({
            description: "Fact Production Order Status from MongoDB to Azure DWH",
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
                    description: "Fact Production Order Status from MongoDB to Azure DWH",
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
                    description: "Fact Production Order Status from MongoDB to Azure DWH",
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
            description: "Fact Production Order Status from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(time) {
        var timestamp = new Date(time[0].start);
        return this.finishingPrintingSalesContractManager.collection.find({
            _updatedDate: {
                $gt: timestamp
            }
        }, {
                _deleted: 1,
                _createdDate: 1,
                salesContractNo: 1,
                orderQuantity: 1,
                "uom.unit": 1,
                "orderType.name": 1
            }).toArray()
            .then((finishingPrintingSalesContracts) => this.joinProductionOrder(finishingPrintingSalesContracts))
            .then((results) => this.joinKanban(results))
            .then((results) => this.joinDailyOperations(results))
            .then((results) => this.joinFabricQualityControl(results))
    }

    joinProductionOrder(finishingPrintingSalesContracts) {
        var joinProductionOrders = finishingPrintingSalesContracts.map((finishingPrintingSalesContract) => {
            return this.productionOrderManager.collection.find({
                _deleted: false,
                salesContractNo: finishingPrintingSalesContract.salesContractNo,
            }, {
                    _createdDate: 1,
                    orderNo: 1,
                    salesContractNo: 1,
                    orderQuantity: 1,
                    "uom.unit": 1
                }).toArray()
                .then((productionOrders) => {
                    var arr = productionOrders.map((productionOrder) => {
                        return {
                            finishingPrintingSalesContract: finishingPrintingSalesContract,
                            productionOrder: productionOrder
                        };
                    });

                    if (arr.length == 0)
                        arr.push({
                            finishingPrintingSalesContract: finishingPrintingSalesContract,
                            productionOrder: null
                        });
                    return Promise.resolve(arr);
                });
        });
        return Promise.all(joinProductionOrders)
            .then((joinProductionOrder => {
                return Promise.resolve([].concat.apply([], joinProductionOrder));
            }));
    }

    joinKanban(data) {
        var joinKanbans = data.map((item) => {
            var getKanbans = item.productionOrder ? this.kanbanManager.collection.find({
                _deleted: false,
                "productionOrder.orderNo": item.productionOrder.orderNo
            }, {
                    _createdDate: 1,
                    code: 1,
                    "productionOrder.salesContractNo": 1,
                    "productionOrder.orderNo": 1,
                    "cart.cartNumber": 1,
                    "cart.qty": 1,
                    "uom.unit": 1
                }).toArray() : Promise.resolve([]);

            return getKanbans.then((kanbans) => {
                var arr = kanbans.map((kanban) => {
                    var obj = Object.assign({}, item);
                    obj.kanban = kanban;
                    return obj;
                });

                if (arr.length == 0) {
                    arr.push(Object.assign({}, item, {
                        kanban: null
                    }));
                }
                return Promise.resolve(arr);
            });
        });

        return Promise.all(joinKanbans)
            .then(((joinKanban) => {
                return Promise.resolve([].concat.apply([], joinKanban));
            }));
    }

    joinDailyOperations(data) {
        var joinDailyOperations = data.map((item) => {
            var getDailyOperations = item.kanban ? this.dailyOperationsManager.collection.find({
                _deleted: false,
                kanbanId: item.kanban._id,
                input: {
                    "$ne": null
                }
            }, {
                    code: 1,
                    input: 1,
                    "kanban.productionOrder.salesContractNo": 1
                }).toArray() : Promise.resolve([]);

            return getDailyOperations.then((dailyOperations) => {
                var arr = dailyOperations.map((dailyOperation) => {
                    var obj = Object.assign({}, item);
                    obj.dailyOperation = dailyOperation;
                    return obj;
                });

                if (arr.length === 0) {
                    arr.push(Object.assign({}, item, {
                        dailyOperation: null
                    }));
                }
                return Promise.resolve(arr);
            });
        });

        return Promise.all(joinDailyOperations)
            .then(((joinDailyOperation) => {
                return Promise.resolve([].concat.apply([], joinDailyOperation));
            }));
    }

    joinFabricQualityControl(data) {
        var joinFabricQualityControls = data.map((item) => {
            var getFabricQualityControls = item.kanban ? this.fabricQualityControlManager.collection.find({
                _deleted: false,
                kanbanCode: item.kanban.code,
                cartNo: item.kanban.cart.cartNumber
            }, {
                    dateIm: 1,
                    uom: 1,
                    fabricGradeTests: 1,
                    code: 1
                }).toArray() : Promise.resolve([]);

            return getFabricQualityControls.then((fabricQualityControls) => {
                var arr = fabricQualityControls.map((fabricQualityControl) => {
                    var obj = Object.assign({}, item);
                    obj.fabricQualityControl = fabricQualityControl;
                    return obj;
                });

                if (arr.length === 0) {
                    arr.push(Object.assign({}, item, {
                        fabricQualityControl: null
                    }));
                }
                return Promise.resolve(arr);
            });
        });

        return Promise.all(joinFabricQualityControls)
            .then(((joinFabricQualityControl) => {
                return Promise.resolve([].concat.apply([], joinFabricQualityControl));
            }));
    }

    orderQuantityConvertion(uom, quantity) {
        if (uom.toLowerCase() === "met" || uom.toLowerCase() === "mtr" || uom.toLowerCase() === "pcs") {
            return quantity;
        } else if (uom.toLowerCase() === "yard" || uom.toLowerCase() === "yds") {
            return quantity * 0.9144;
        } else {
            return quantity;
        }
    }

    transform(data) {
        var result = data.map((item) => {
            var finishingPrintingSC = item.finishingPrintingSalesContract;
            var productionOrder = item.productionOrder;
            var kanban = item.kanban;
            var fabricQC = item.fabricQualityControl;
            var dailyOperation = item.dailyOperation

            if (fabricQC) {
                var results = fabricQC.fabricGradeTests.map((fabricGradeTest) => {
                    var quantity = fabricGradeTest.initLength;

                    return {
                        salesContractDate: finishingPrintingSC._createdDate ? `'${moment(finishingPrintingSC._createdDate).format("L")}'` : null,
                        salesContractNo: finishingPrintingSC.salesContractNo ? `'${finishingPrintingSC.salesContractNo}'` : null,
                        salesContractQuantity: finishingPrintingSC.orderQuantity ? `${this.orderQuantityConvertion(finishingPrintingSC.uom.unit, finishingPrintingSC.orderQuantity)}` : null,
                        productionOrderDate: productionOrder._createdDate ? `'${moment(productionOrder._createdDate).format("L")}'` : null,
                        productionSalesContractNo: productionOrder.salesContractNo ? `'${productionOrder.salesContractNo}'` : null,
                        productionOrderNo: productionOrder.orderNo ? `'${productionOrder.orderNo}'` : null,
                        productionOrderQuantity: productionOrder.orderQuantity ? `${this.orderQuantityConvertion(productionOrder.uom.unit, productionOrder.orderQuantity)}` : null,
                        kanbanDate: kanban._createdDate ? `'${moment(kanban._createdDate).format("L")}'` : null,
                        kanbanCode: kanban.code ? `'${kanban.code}'` : null,
                        kanbanSalesContractNo: kanban.productionOrder && kanban.productionOrder.salesContractNo ? `'${kanban.productionOrder.salesContractNo}'` : null,
                        kanbanQuantity: kanban && kanban.cart.qty && kanban.uom && kanban.uom.unit ? `${this.orderQuantityConvertion(kanban.uom.unit, kanban.cart.qty)}` : null,
                        dailyOperationQuantity: dailyOperation ? `${dailyOperation.input}` : null,
                        dailyOperationSalesContractNo: dailyOperation ? `'${dailyOperation.kanban.productionOrder.salesContractNo}'` : null,
                        dailyOperationCode: dailyOperation ? `'${dailyOperation.code}'` : null,
                        cartNumber: kanban && kanban.cart.cartNumber ? `'${kanban.cart.cartNumber}'` : null,
                        fabricQualityControlDate: fabricQC.dateIm ? `'${moment(fabricQC.dateIm).format("L")}'` : null,
                        fabricQualityControlQuantity: quantity ? `${quantity}` : null,
                        fabricQualityControlCode: fabricQC.code ? `'${fabricQC.code}'` : null,
                        orderType: finishingPrintingSC && finishingPrintingSC.orderType && finishingPrintingSC.orderType.name ? `'${finishingPrintingSC.orderType.name}'` : null,
                        deleted: `'${finishingPrintingSC._deleted}'`
                    }
                });
                return [].concat.apply([], results);
            } else {
                return {
                    salesContractDate: finishingPrintingSC._createdDate ? `'${moment(finishingPrintingSC._createdDate).format("L")}'` : null,
                    salesContractNo: finishingPrintingSC.salesContractNo ? `'${finishingPrintingSC.salesContractNo}'` : null,
                    salesContractQuantity: finishingPrintingSC.orderQuantity ? `${this.orderQuantityConvertion(finishingPrintingSC.uom.unit, finishingPrintingSC.orderQuantity)}` : null,
                    productionOrderDate: productionOrder && productionOrder._createdDate ? `'${moment(productionOrder._createdDate).format("L")}'` : null,
                    productionSalesContractNo: productionOrder && productionOrder.salesContractNo ? `'${productionOrder.salesContractNo}'` : null,
                    productionOrderNo: productionOrder && productionOrder.orderNo ? `'${productionOrder.orderNo}'` : null,
                    productionOrderQuantity: productionOrder && productionOrder.orderQuantity ? `${this.orderQuantityConvertion(productionOrder.uom.unit, productionOrder.orderQuantity)}` : null,
                    kanbanDate: kanban && kanban._createdDate ? `'${moment(kanban._createdDate).format("L")}'` : null,
                    kanbanCode: kanban && kanban.code ? `'${kanban.code}'` : null,
                    kanbanSalesContractNo: kanban && kanban.productionOrder && kanban.productionOrder.salesContractNo ? `'${kanban.productionOrder.salesContractNo}'` : null,
                    dailyOperationQuantity: dailyOperation ? `${dailyOperation.input}` : null,
                    dailyOperationSalesContractNo: dailyOperation ? `'${dailyOperation.kanban.productionOrder.salesContractNo}'` : null,
                    dailyOperationCode: dailyOperation ? `'${dailyOperation.code}'` : null,
                    kanbanQuantity: kanban && kanban.cart.qty && kanban.uom && kanban.uom.unit ? `${this.orderQuantityConvertion(kanban.uom.unit, kanban.cart.qty)}` : null,
                    cartNumber: kanban && kanban.cart.cartNumber ? `'${kanban.cart.cartNumber}'` : null,
                    fabricQualityControlDate: null,
                    fabricQualityControlQuantity: null,
                    fabricQualityControlCode: null,
                    orderType: finishingPrintingSC && finishingPrintingSC.orderType && finishingPrintingSC.orderType.name ? `'${finishingPrintingSC.orderType.name}'` : null,
                    deleted: `'${finishingPrintingSC._deleted}'`
                }
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
                                var queryString = `INSERT INTO [dbo].[DL_Fact_Production_Order_Status_Temp]([salesContractDate], [salesContractNo], [salesContractQuantity], [productionOrderDate], [productionSalesContractNo], [productionOrderNo], [productionOrderQuantity], [kanbanDate], [kanbanSalesContractNo], [kanbanQuantity], [fabricQualityControlDate], [fabricQualityControlQuantity], [orderType], [deleted], [kanbanCode], [dailyOperationQuantity], [dailyOperationSalesContractNo], [dailyOperationCode], [fabricQualityControlCode], [cartNumber]) VALUES(${item.salesContractDate}, ${item.salesContractNo}, ${item.salesContractQuantity}, ${item.productionOrderDate}, ${item.productionSalesContractNo}, ${item.productionOrderNo}, ${item.productionOrderQuantity}, ${item.kanbanDate}, ${item.kanbanSalesContractNo}, ${item.kanbanQuantity}, ${item.fabricQualityControlDate}, ${item.fabricQualityControlQuantity}, ${item.orderType}, ${item.deleted}, ${item.kanbanCode}, ${item.dailyOperationQuantity}, ${item.dailyOperationSalesContractNo}, ${item.dailyOperationCode}, ${item.fabricQualityControlCode}, ${item.cartNumber});\n`;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 === 0) {
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
                        // var path = "C:\\Users\\leslie.aula\\Desktop\\orderstatus.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("[DL_Upsert_Fact_Production_Order_Status]").then((execResult) => {
                                    request.execute("DL_INSERT_DIMTIME").then((execResult) => {
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