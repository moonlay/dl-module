'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var InventoryMovementManager = require("../managers/inventory/inventory-movement-manager");
const MIGRATION_LOG_DESCRIPTION = "Fact Inventory Movement from MongoDB to Azure DWH"

module.exports = class FactInventoryMovementManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.inventoryMovementManager = new InventoryMovementManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date()
        this.migrationLog.insert({
            description: MIGRATION_LOG_DESCRIPTION,
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
                    description: MIGRATION_LOG_DESCRIPTION,
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
                    description: MIGRATION_LOG_DESCRIPTION,
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
            description: MIGRATION_LOG_DESCRIPTION,
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extract(time) {
        var timestamp = new Date(time[0].start);
        // var timestamp = new Date(1970, 1, 1);
        return this.inventoryMovementManager.collection.find({
            _updatedDate: {
                $gt: timestamp
            }
        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {
            var date = moment(item.date).format("YYYY-MM-DD");

            return {
                storageCode: item.storageCode ? `'${item.storageCode.replace(/'/g, '"')}'` : null,
                storageName: item.storageName ? `'${item.storageName.replace(/'/g, '"')}'` : null,
                date: `'${date}'`,
                qty: item.quantity,
                status: item.type ? `'${item.type}'` : null,
                productCode: item.productCode ? `'${item.productCode.replace(/'/g, '"')}'` : null,
                productName: item.productName ? `'${item.productName.replace(/'/g, '"')}'` : null,
                uom: item.uom ? `'${item.uom.replace(/'/g, '"')}'` : null,
                deleted: `'${item._deleted}'`,
                code: item.code ? `'${item.code.replace(/'/g, '"')}'` : null,
                referenceNo: item.referenceNo ? `'${item.referenceNo.replace(/'/g, '"')}'` : null,
                referenceType: item.referenceType ? `'${item.referenceType.replace(/'/g, '"')}'` : null,
                before: item.before,
                after: item.after,
                remark: item.remark ? `'${item.remark.replace(/'/g, '"')}'` : null,
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
                                var values = `${item.storageCode}, ${item.date}, ${item.qty}, ${item.status}, ${item.productCode}, ${item.uom}, ${item.deleted}, ${item.code}, ${item.referenceNo}, ${item.referenceType}, ${item.before}, ${item.after}, ${item.remark}, ${item.storageName}, ${item.productName}`
                                var queryString = sqlQuery === "" ? `INSERT INTO [DL_Fact_Inventory_Movement_Temp]([Storage Code], [Date], [Quantity], [Status], [Product Code], [UOM], [Deleted], [Code], [ReferenceNo], [ReferenceType], [Before], [After], [Remark], [Storage Name], [Product Name]) VALUES(${values})` : `,(${values})`;
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
                        // var path = "C:\\Users\\jacky.rusly\\Desktop\\Log.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_Upsert_Fact_Inventory_Movement").then((execResult) => {
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